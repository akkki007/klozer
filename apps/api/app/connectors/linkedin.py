"""
LinkedIn connector — OAuth + Organization data + Lead Gen Forms sync + Campaign analytics.

Access tiers (LinkedIn Developer Products):
  - Community Management API  -> r_organization_admin / r_organization_social  (org data)
  - Lead Sync API             -> r_marketing_leadgen_automation                (lead gen forms)
  - Advertising API           -> rw_ads                                        (campaign analytics)

Until those products are approved/provisioned, the OAuth scopes are rejected and the
data endpoints return 403 — the code below is complete and activates on approval.

All REST calls require:
  Authorization: Bearer <token>
  LinkedIn-Version: YYYYMM  (settings.LINKEDIN_API_VERSION)
  X-Restli-Protocol-Version: 2.0.0
"""
import logging
import urllib.parse
from datetime import datetime, timedelta
from typing import Any

import httpx
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.connectors.base import SocialConnector
from app.models.integration import IntegrationCredential, IntegrationProvider, IntegrationStatus
from app.models.lead import Lead, LeadSource, LeadSourceType, LeadSourceStatus, LeadCategory, WebhookEvent
from app.services.crypto_service import encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
API = "https://api.linkedin.com/rest"

# Request only provisioned scopes (configurable via LINKEDIN_SCOPES). Default is
# the approved Lead Sync scope; add rw_ads / r_organization_admin once those
# products are approved.
#   r_marketing_leadgen_automation -> Lead Sync API (lead gen form responses)
#   rw_ads                         -> Advertising API (campaign analytics)
#   r_organization_admin           -> Community Management API (org data)
LINKEDIN_SCOPES = settings.LINKEDIN_SCOPES or "r_marketing_leadgen_automation"

# LinkedIn lead-form predefined question names → our canonical lead fields.
_FIELD_MAP = {
    "FIRST_NAME": "first_name",
    "LAST_NAME": "last_name",
    "EMAIL": "email",
    "PHONE_NUMBER": "phone",
    "COMPANY_NAME": "company",
    "JOB_TITLE": "job_title",
    "FULL_NAME": "full_name",
}


class LinkedInConnector(SocialConnector):

    @property
    def provider(self) -> str:
        return "linkedin"

    def is_configured(self) -> bool:
        return bool(settings.LINKEDIN_CLIENT_ID and settings.LINKEDIN_CLIENT_SECRET)

    def _headers(self, token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "LinkedIn-Version": settings.LINKEDIN_API_VERSION,
            "X-Restli-Protocol-Version": "2.0.0",
        }

    # ─── OAuth ───────────────────────────────────────────────────────────────

    def get_auth_url(self, org_id: str, state: str) -> str | None:
        if not self.is_configured():
            return None
        params = urllib.parse.urlencode({
            "response_type": "code",
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "redirect_uri": f"{settings.OAUTH_REDIRECT_BASE}/linkedin/callback",
            "state": state,
            "scope": LINKEDIN_SCOPES,
        })
        return f"{LINKEDIN_AUTH_URL}?{params}"

    async def handle_callback(self, org_id: str, code: str, db: AsyncSession) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                LINKEDIN_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.LINKEDIN_CLIENT_ID,
                    "client_secret": settings.LINKEDIN_CLIENT_SECRET,
                    "redirect_uri": f"{settings.OAUTH_REDIRECT_BASE}/linkedin/callback",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            token_data = resp.json()

        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 5183999)  # ~60 days
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        cred = (await db.execute(select(IntegrationCredential).where(
            IntegrationCredential.org_id == org_id,
            IntegrationCredential.provider == IntegrationProvider.linkedin,
        ))).scalar_one_or_none()
        if cred:
            cred.access_token_enc = encrypt_token(access_token)
            cred.refresh_token_enc = encrypt_token(refresh_token) if refresh_token else None
            cred.expires_at = expires_at
            cred.scopes = LINKEDIN_SCOPES
            cred.status = IntegrationStatus.active
        else:
            cred = IntegrationCredential(
                org_id=org_id,
                provider=IntegrationProvider.linkedin,
                access_token_enc=encrypt_token(access_token),
                refresh_token_enc=encrypt_token(refresh_token) if refresh_token else None,
                expires_at=expires_at,
                scopes=LINKEDIN_SCOPES,
                status=IntegrationStatus.active,
            )
            db.add(cred)
        await db.commit()
        return {"provider": "linkedin", "status": "connected"}

    async def valid_token(self, db: AsyncSession, cred: IntegrationCredential) -> str:
        """Return a usable access token, refreshing it if expired and a refresh token exists."""
        if cred.expires_at and cred.expires_at > datetime.utcnow() + timedelta(minutes=5):
            return decrypt_token(cred.access_token_enc)
        if not cred.refresh_token_enc:
            return decrypt_token(cred.access_token_enc)  # best effort; may 401
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                LINKEDIN_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": decrypt_token(cred.refresh_token_enc),
                    "client_id": settings.LINKEDIN_CLIENT_ID,
                    "client_secret": settings.LINKEDIN_CLIENT_SECRET,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()
        token = data["access_token"]
        cred.access_token_enc = encrypt_token(token)
        if data.get("refresh_token"):
            cred.refresh_token_enc = encrypt_token(data["refresh_token"])
        cred.expires_at = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 5183999))
        await db.commit()
        return token

    # ─── Organizations (Community Management API) ────────────────────────────

    async def fetch_organizations(self, token: str) -> list[dict]:
        """List the Company Pages the authenticated member administers."""
        async with httpx.AsyncClient(timeout=20) as client:
            acl = await client.get(
                f"{API}/organizationAcls",
                params={"q": "roleAssignee", "role": "ADMINISTRATOR", "state": "APPROVED"},
                headers=self._headers(token),
            )
            acl.raise_for_status()
            org_urns = [e.get("organization") for e in acl.json().get("elements", []) if e.get("organization")]

            orgs: list[dict] = []
            for urn in org_urns:
                org_id = urn.rsplit(":", 1)[-1]
                try:
                    o = await client.get(
                        f"{API}/organizations/{org_id}",
                        params={"fields": "id,localizedName,vanityName,localizedWebsite,logoV2,industries"},
                        headers=self._headers(token),
                    )
                    o.raise_for_status()
                    od = o.json()
                except httpx.HTTPStatusError:
                    od = {"id": org_id, "localizedName": urn}
                followers = await self._followers(client, token, urn)
                orgs.append({
                    "urn": urn,
                    "id": org_id,
                    "name": od.get("localizedName") or od.get("vanityName") or org_id,
                    "website": od.get("localizedWebsite"),
                    "logo": self._logo_urn(od),
                    "industry": (od.get("industries") or [None])[0],
                    "followers": followers,
                })
            return orgs

    async def _followers(self, client: httpx.AsyncClient, token: str, org_urn: str) -> int | None:
        try:
            r = await client.get(
                f"{API}/networkSizes/{org_urn}",
                params={"edgeType": "COMPANY_FOLLOWED_BY_MEMBER"},
                headers=self._headers(token),
            )
            if r.is_success:
                return r.json().get("firstDegreeSize")
        except httpx.HTTPError:
            pass
        return None

    @staticmethod
    def _logo_urn(org: dict) -> str | None:
        # logoV2.original is a digitalmediaAsset urn; resolving to a URL needs an
        # extra Images API call — store the urn for now (best effort).
        logo = org.get("logoV2") or {}
        return logo.get("original")

    # ─── Lead Gen Forms (Lead Sync API) ──────────────────────────────────────

    async def sync_lead_responses(
        self, org_id, token: str, organization_urn: str, db: AsyncSession,
    ) -> dict[str, Any]:
        """
        Pull lead-form responses for the org and upsert them as Leads
        (source = linkedin). Idempotent on the LinkedIn response id.
        """
        source = await self._ensure_source(db, org_id)
        created = 0
        seen = 0
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{API}/leadFormResponses",
                params={"q": "owner", "owner": organization_urn},
                headers=self._headers(token),
            )
            resp.raise_for_status()
            elements = resp.json().get("elements", [])

        for el in elements:
            seen += 1
            ext_id = str(el.get("id"))
            existing = (await db.execute(
                select(WebhookEvent).where(WebhookEvent.external_id == f"li:{ext_id}")
            )).scalar_one_or_none()
            if existing:
                continue
            db.add(WebhookEvent(provider="linkedin", external_id=f"li:{ext_id}",
                                payload_json=el, status="processed", processed_at=datetime.utcnow()))

            fields = self._parse_answers(el)
            name = (
                fields.get("full_name")
                or " ".join(p for p in [fields.get("first_name"), fields.get("last_name")] if p).strip()
                or "LinkedIn Lead"
            )
            db.add(Lead(
                org_id=org_id,
                source_id=source.id,
                name=name,
                email=fields.get("email"),
                phone=fields.get("phone"),
                category=LeadCategory.fresh,
                raw_payload_json={
                    "company": fields.get("company"),
                    "job_title": fields.get("job_title"),
                    "form": el.get("form"),
                    "campaign": el.get("campaign"),
                    "submitted_at": el.get("submittedAt"),
                    "linkedin_response_id": ext_id,
                },
            ))
            created += 1

        await db.commit()
        return {"synced": created, "seen": seen}

    @staticmethod
    def _parse_answers(response: dict) -> dict[str, str]:
        """Flatten a leadFormResponse's answers into canonical fields."""
        out: dict[str, str] = {}
        answers = (response.get("formResponse") or {}).get("answers") or response.get("answers") or []
        for a in answers:
            key = a.get("questionId") or a.get("predefinedField") or ""
            field = _FIELD_MAP.get(str(key).upper())
            if not field:
                continue
            ans = a.get("answer") or {}
            # answer can be {"textQuestionAnswer":{"answer":"..."}} or a plain string
            val = (
                (ans.get("textQuestionAnswer") or {}).get("answer")
                if isinstance(ans, dict) else ans
            )
            if val:
                out[field] = val
        return out

    async def _ensure_source(self, db: AsyncSession, org_id) -> LeadSource:
        source = (await db.execute(select(LeadSource).where(
            LeadSource.org_id == org_id, LeadSource.type == LeadSourceType.linkedin,
        ))).scalar_one_or_none()
        if not source:
            source = LeadSource(org_id=org_id, type=LeadSourceType.linkedin,
                                name="LinkedIn Lead Gen Forms", status=LeadSourceStatus.connected)
            db.add(source)
            await db.flush()
        return source

    # ─── Campaign analytics (Advertising API) ────────────────────────────────

    async def fetch_campaign_analytics(self, token: str, organization_urn: str) -> dict[str, Any]:
        """
        Aggregate campaign performance for the org's ad accounts.
        Returns headline metrics + per-campaign rows for the dashboard.
        """
        async with httpx.AsyncClient(timeout=30) as client:
            # Ad accounts the org can access.
            acc = await client.get(
                f"{API}/adAccounts",
                params={"q": "search"},
                headers=self._headers(token),
            )
            acc.raise_for_status()
            accounts = [a.get("id") for a in acc.json().get("elements", []) if a.get("id")]

            campaigns: list[dict] = []
            for acct_id in accounts:
                c = await client.get(
                    f"{API}/adCampaigns",
                    params={"q": "search", "search": f"(account:(values:List(urn:li:sponsoredAccount:{acct_id})))"},
                    headers=self._headers(token),
                )
                if c.is_success:
                    campaigns.extend(c.json().get("elements", []))

            rows: list[dict] = []
            totals = {"impressions": 0, "clicks": 0, "cost": 0.0, "leads": 0}
            for camp in campaigns:
                cid = camp.get("id")
                if not cid:
                    continue
                a = await client.get(
                    f"{API}/adAnalytics",
                    params={
                        "q": "analytics", "pivot": "CAMPAIGN", "timeGranularity": "ALL",
                        "campaigns": f"List(urn:li:sponsoredCampaign:{cid})",
                        "fields": "impressions,clicks,costInLocalCurrency,oneClickLeads",
                    },
                    headers=self._headers(token),
                )
                stat = (a.json().get("elements", [{}])[0] if a.is_success else {}) or {}
                imp = int(stat.get("impressions", 0) or 0)
                clk = int(stat.get("clicks", 0) or 0)
                cost = float(stat.get("costInLocalCurrency", 0) or 0)
                leads = int(stat.get("oneClickLeads", 0) or 0)
                totals["impressions"] += imp
                totals["clicks"] += clk
                totals["cost"] += cost
                totals["leads"] += leads
                rows.append({
                    "campaign_id": cid,
                    "name": camp.get("name", str(cid)),
                    "impressions": imp,
                    "clicks": clk,
                    "ctr": round(clk / imp * 100, 2) if imp else 0,
                    "cpc": round(cost / clk, 2) if clk else 0,
                    "cpl": round(cost / leads, 2) if leads else 0,
                    "leads": leads,
                })

        ti, tc, tcost, tl = totals["impressions"], totals["clicks"], totals["cost"], totals["leads"]
        return {
            "totals": {
                "impressions": ti,
                "clicks": tc,
                "ctr": round(tc / ti * 100, 2) if ti else 0,
                "cpc": round(tcost / tc, 2) if tc else 0,
                "cpl": round(tcost / tl, 2) if tl else 0,
                "leads": tl,
                "spend": round(tcost, 2),
            },
            "campaigns": rows,
        }

    # ─── Webhook (LinkedIn uses polling, not push) ───────────────────────────

    def verify_webhook(self, request: Request) -> str | bool:
        return True

    async def handle_webhook(self, payload: dict, db: AsyncSession) -> None:
        # LinkedIn lead sync is poll-based (sync_lead_responses); no inbound webhook.
        pass
