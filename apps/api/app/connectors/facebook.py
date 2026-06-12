"""
Facebook + Instagram connector — full social-media marketing scope set.

Connect is a two-phase flow:
  1. discover  — OAuth → long-lived user token → enumerate every Page (+ linked
                 Instagram account) and ad account the token can reach.
  2. install   — user picks which assets to install; one IntegrationCredential is
                 stored per selected asset and Pages are subscribed to leadgen.

Scopes requested (verified against https://developers.facebook.com/docs/permissions/,
Graph API v25.0) cover lead capture, content publishing, engagement, messaging,
ads and insights for both Facebook Pages and Instagram:
  Pages:      pages_show_list, pages_read_engagement, pages_manage_metadata,
              pages_manage_posts, pages_manage_engagement, pages_manage_ads,
              pages_messaging, read_insights
  Leads:      leads_retrieval
  Ads:        ads_management, ads_read, business_management
  Instagram:  instagram_basic, instagram_content_publish, instagram_manage_comments,
              instagram_manage_insights, instagram_manage_messages

App Review notes:
  - Dev mode only receives test leads/assets; submit for App Review before going live.
  - Submit ALL scopes below in one review cycle — each needs a permission justification.
"""
import hashlib
import hmac
import logging
import urllib.parse
from datetime import datetime
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

# Full marketing scope set — the end-goal once App Review + Business Verification
# are approved. Dependencies are listed per the official Meta Permissions Reference
# (https://developers.facebook.com/docs/permissions/); a scope is "Invalid" until
# its owning use case/product is added in the app dashboard, and (except
# public_profile) until App Review grants it.
#
# Per the reference, only `public_profile` is granted automatically. `ads_*` and
# `business_management` additionally require Business Verification. To test the
# flow before review, override these via the FB_SCOPES env var with the subset
# your app's use cases currently expose.
DEFAULT_FACEBOOK_SCOPES = [
    # Identity (auto-granted)
    "public_profile",
    # Pages — read, publish, engage, message, insights
    "pages_show_list",            # foundation, no deps
    "pages_read_engagement",      # dep: pages_show_list
    "pages_read_user_content",    # dep of pages_manage_engagement + instagram_basic
    "pages_manage_metadata",      # dep: pages_show_list
    "pages_manage_posts",         # dep: pages_read_engagement
    "pages_manage_engagement",    # dep: pages_read_user_content
    "pages_manage_ads",           # dep: pages_show_list
    "pages_messaging",            # dep: pages_manage_metadata
    "read_insights",              # dep: pages_read_engagement
    # Lead capture (dep: ads_management, pages_manage_ads)
    "leads_retrieval",
    # Ads / Business (require Business Verification)
    "ads_management",
    "ads_read",
    "business_management",
    # Instagram — read, publish, comments, insights, messaging (dep: instagram_basic)
    "instagram_basic",            # dep: pages_read_user_content, pages_show_list
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
    "instagram_manage_messages",
]

# Allow overriding via env (e.g. a minimal set that's valid before App Review).
FACEBOOK_SCOPES = ",".join(
    s.strip() for s in settings.FB_SCOPES.split(",") if s.strip()
) or ",".join(DEFAULT_FACEBOOK_SCOPES)

GRAPH_BASE = "https://graph.facebook.com"

logger = logging.getLogger(__name__)


class FacebookConnector(SocialConnector):

    @property
    def provider(self) -> str:
        return "facebook"

    def is_configured(self) -> bool:
        return bool(settings.FB_APP_ID and settings.FB_APP_SECRET)

    def get_auth_url(self, org_id: str, state: str) -> str | None:
        if not self.is_configured():
            return None
        params = {
            "client_id": settings.FB_APP_ID,
            "redirect_uri": f"{settings.OAUTH_REDIRECT_BASE}/{self.provider}/callback",
            "state": state,
            "response_type": "code",
        }
        if settings.FB_LOGIN_CONFIG_ID:
            # Facebook Login for Business: permissions are defined by the
            # configuration, NOT the scope param. Sending `scope` alongside a
            # config_id causes Meta's "Invalid Scopes" error.
            params["config_id"] = settings.FB_LOGIN_CONFIG_ID
            params["override_default_response_type"] = "true"
        else:
            # Classic Facebook Login: request scopes directly.
            params["scope"] = FACEBOOK_SCOPES
        return f"https://www.facebook.com/{settings.META_GRAPH_VERSION}/dialog/oauth?{urllib.parse.urlencode(params)}"

    # ─── Two-phase connect: discover → install ──────────────────────────────

    async def exchange_for_user_token(self, code: str) -> tuple[str, str]:
        """
        Phase 1a: code → short-lived → long-lived user token (~60 days).
        Returns (long_lived_user_token, fb_user_id).
        """
        async with httpx.AsyncClient() as client:
            short_token = await self._exchange_code(client, code)
            long_token = await self._extend_token(client, short_token)
            me = await client.get(
                f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/me",
                params={"access_token": long_token, "fields": "id,name"},
            )
            me.raise_for_status()
            fb_user_id = me.json().get("id", "")
        return long_token, fb_user_id

    async def _get_edge(self, client: httpx.AsyncClient, edge: str, fields: str,
                        user_token: str, required: bool) -> list[dict]:
        """
        Fetch a Graph edge (e.g. me/accounts). Ad accounts / Instagram depend on
        permissions the app may not have granted yet, so non-required edges fail
        soft (return []) instead of breaking the whole discovery.
        """
        try:
            resp = await client.get(
                f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/me/{edge}",
                params={"access_token": user_token, "fields": fields, "limit": 100},
            )
            resp.raise_for_status()
            return resp.json().get("data", [])
        except httpx.HTTPStatusError as e:
            if required:
                raise
            detail = e.response.text[:300] if e.response is not None else str(e)
            logger.warning("Skipping me/%s during discovery (%s): %s", edge, e, detail)
            return []

    async def discover_assets(self, user_token: str) -> dict[str, Any]:
        """
        Phase 2: enumerate everything the user token can reach so the UI can
        present them for selection — Pages (with any linked Instagram business
        account) and ad accounts. Pages are required; ad accounts are best-effort
        (they need ads_read/ads_management + the Marketing API feature, which an
        unreviewed app often lacks).
        """
        async with httpx.AsyncClient() as client:
            raw_pages = await self._get_edge(
                client, "accounts",
                "id,name,category,picture{url},"
                "instagram_business_account{id,username,name,profile_picture_url}",
                user_token, required=True,
            )
            raw_ad_accounts = await self._get_edge(
                client, "adaccounts", "id,name,account_status,currency",
                user_token, required=False,
            )

        pages: list[dict] = []
        instagram: list[dict] = []
        for p in raw_pages:
            pic = (p.get("picture", {}).get("data", {}) or {}).get("url")
            pages.append({
                "type": "page",
                "id": p["id"],
                "name": p.get("name", p["id"]),
                "picture": pic,
                "category": p.get("category"),
            })
            ig = p.get("instagram_business_account")
            if ig:
                instagram.append({
                    "type": "instagram",
                    "id": ig["id"],
                    "name": ig.get("name") or ig.get("username", ig["id"]),
                    "username": ig.get("username"),
                    "picture": ig.get("profile_picture_url"),
                    "page_id": p["id"],
                    "page_name": p.get("name"),
                })

        ad_accounts = [{
            "type": "ad_account",
            "id": a["id"],
            "name": a.get("name", a["id"]),
            "picture": None,
            "currency": a.get("currency"),
            "account_status": a.get("account_status"),
        } for a in raw_ad_accounts]

        return {"pages": pages, "instagram": instagram, "ad_accounts": ad_accounts}

    async def fetch_asset_details(self, token: str, account_id: str, asset_type: str) -> dict[str, Any]:
        """Best-effort live fetch of richer fields for a connected asset's detail view."""
        fields_by_type = {
            "page": "name,about,category,fan_count,followers_count,link,"
                    "verification_status,username,picture{url}",
            "instagram": "username,name,biography,followers_count,follows_count,"
                         "media_count,profile_picture_url,website",
            "ad_account": "name,account_status,currency,amount_spent,balance,"
                          "business_name,timezone_name",
        }
        fields = fields_by_type.get(asset_type, "name")
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/{account_id}",
                params={"access_token": token, "fields": fields},
            )
            resp.raise_for_status()
            data = resp.json()
        # flatten nested picture
        pic = (data.pop("picture", {}) or {}).get("data", {}) if isinstance(data.get("picture"), dict) else {}
        if pic.get("url"):
            data["picture_url"] = pic["url"]
        return data

    async def install_assets(
        self,
        org_id: str,
        selected: list[dict],
        user_token: str,
        db: AsyncSession,
    ) -> list[dict]:
        """
        Phase 3: persist the user's chosen assets as active credentials.
          - page        → fetch its page token, subscribe leadgen webhook, store page token
          - instagram   → store under the parent Page's token (IG APIs use the page token)
          - ad_account  → store the user token (ad APIs use the user/system token)
        """
        # Map of all pages → page token, fetched once.
        async with httpx.AsyncClient() as client:
            page_map = {p["id"]: p for p in await self._get_pages(client, user_token)}

        installed: list[dict] = []
        any_page = False
        async with httpx.AsyncClient() as client:
            for asset in selected:
                atype = asset.get("type")
                aid = asset.get("id")

                if atype == "page":
                    page = page_map.get(aid)
                    if not page:
                        continue
                    page_token = page["access_token"]
                    # Lead-ads webhook subscription is best-effort: it needs
                    # pages_manage_metadata + leadgen webhooks configured, which an
                    # unreviewed app may lack. Don't block connecting the Page on it.
                    leadgen_subscribed = True
                    try:
                        await self._subscribe_page_to_webhook(client, aid, page_token)
                    except httpx.HTTPStatusError as e:
                        leadgen_subscribed = False
                        detail = e.response.text[:300] if e.response is not None else str(e)
                        logger.warning("Leadgen webhook subscribe failed for page %s (%s): %s",
                                       aid, e, detail)
                    cred = await self._upsert_credential(
                        db=db, org_id=org_id, page_id=aid,
                        page_name=page.get("name", aid), page_token=page_token,
                    )
                    cred.meta_json = {
                        "type": "page",
                        "picture": asset.get("picture"),
                        "leadgen_subscribed": leadgen_subscribed,
                    }
                    any_page = True

                elif atype == "instagram":
                    parent = page_map.get(asset.get("page_id"))
                    token = parent["access_token"] if parent else user_token
                    cred = await self._upsert_asset_credential(
                        db, org_id, aid, asset.get("name", aid), token,
                        {"type": "instagram", "page_id": asset.get("page_id"),
                         "username": asset.get("username"), "picture": asset.get("picture")},
                    )

                elif atype == "ad_account":
                    cred = await self._upsert_asset_credential(
                        db, org_id, aid, asset.get("name", aid), user_token,
                        {"type": "ad_account", "currency": asset.get("currency")},
                    )
                else:
                    continue

                await db.flush()
                installed.append({"cred_id": str(cred.id), "type": atype, "id": aid,
                                  "name": asset.get("name")})

        await db.commit()
        if any_page:
            await self._ensure_lead_source(db, org_id)
            await db.commit()
        return installed

    async def handle_callback(self, org_id: str, code: str, db: AsyncSession) -> dict[str, Any]:
        """
        Interface fallback (non-interactive): exchange code and install every
        Page discovered. The interactive UI uses exchange_for_user_token +
        discover_assets + install_assets instead so the user can choose.
        """
        user_token, _ = await self.exchange_for_user_token(code)
        assets = await self.discover_assets(user_token)
        installed = await self.install_assets(org_id, assets["pages"], user_token, db)
        return {"pages_connected": installed, "provider": self.provider}

    # ─── Webhook handling ───────────────────────────────────────────────────

    def verify_webhook(self, request: Request) -> str | bool:
        """
        GET: hub.challenge verification — return the challenge string.
        POST: HMAC-SHA256 signature check — return True if valid.
        (Router calls this before deciding to process or reject.)
        """
        # GET verification is handled by the router; this handles POST signature check
        signature_header = request.headers.get("X-Hub-Signature-256", "")
        return signature_header  # router will call _verify_signature with the body

    def verify_signature(self, body: bytes, signature_header: str) -> bool:
        if not signature_header.startswith("sha256="):
            return False
        expected = hmac.new(
            settings.FB_APP_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        received = signature_header.removeprefix("sha256=")
        return hmac.compare_digest(expected, received)

    async def handle_webhook(self, payload: dict, db: AsyncSession) -> None:
        """
        Process leadgen webhook events.
        Payload shape: { "entry": [{ "changes": [{ "value": { "leadgen_id": "...", "page_id": "..." } }] }] }
        """
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                if change.get("field") != "leadgen":
                    continue

                leadgen_id = value.get("leadgen_id")
                page_id = value.get("page_id")
                if not leadgen_id:
                    continue

                # Idempotency check
                existing = await db.execute(
                    select(WebhookEvent).where(WebhookEvent.external_id == leadgen_id)
                )
                if existing.scalar_one_or_none():
                    continue  # already processed

                # Persist event record first (mark pending)
                event = WebhookEvent(
                    provider="facebook",
                    external_id=leadgen_id,
                    payload_json=payload,
                    status="pending",
                )
                db.add(event)
                await db.flush()

                try:
                    lead = await self._fetch_and_create_lead(db, leadgen_id, page_id)
                    event.status = "processed"
                    event.processed_at = datetime.utcnow()
                except Exception as exc:
                    event.status = "failed"
                    event.meta_json = {"error": str(exc)}

        await db.commit()

    # ─── Private helpers ────────────────────────────────────────────────────

    async def _exchange_code(self, client: httpx.AsyncClient, code: str) -> str:
        resp = await client.get(
            f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/oauth/access_token",
            params={
                "client_id": settings.FB_APP_ID,
                "client_secret": settings.FB_APP_SECRET,
                "redirect_uri": f"{settings.OAUTH_REDIRECT_BASE}/{self.provider}/callback",
                "code": code,
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]

    async def _extend_token(self, client: httpx.AsyncClient, short_token: str) -> str:
        resp = await client.get(
            f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.FB_APP_ID,
                "client_secret": settings.FB_APP_SECRET,
                "fb_exchange_token": short_token,
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]

    async def _get_pages(self, client: httpx.AsyncClient, user_token: str) -> list[dict]:
        resp = await client.get(
            f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/me/accounts",
            params={"access_token": user_token, "fields": "id,name,access_token,category"},
        )
        resp.raise_for_status()
        return resp.json().get("data", [])

    async def _subscribe_page_to_webhook(
        self, client: httpx.AsyncClient, page_id: str, page_token: str
    ) -> None:
        resp = await client.post(
            f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/{page_id}/subscribed_apps",
            params={"subscribed_fields": "leadgen", "access_token": page_token},
        )
        resp.raise_for_status()

    async def _upsert_credential(
        self,
        db: AsyncSession,
        org_id: str,
        page_id: str,
        page_name: str,
        page_token: str,
    ) -> IntegrationCredential:
        result = await db.execute(
            select(IntegrationCredential).where(
                IntegrationCredential.org_id == org_id,
                IntegrationCredential.provider == IntegrationProvider.facebook,
                IntegrationCredential.external_account_id == page_id,
            )
        )
        cred = result.scalar_one_or_none()
        enc_token = encrypt_token(page_token)

        if cred:
            cred.access_token_enc = enc_token
            cred.external_account_name = page_name
            cred.status = IntegrationStatus.active
            cred.scopes = FACEBOOK_SCOPES
        else:
            cred = IntegrationCredential(
                org_id=org_id,
                provider=IntegrationProvider.facebook,
                access_token_enc=enc_token,
                external_account_id=page_id,
                external_account_name=page_name,
                scopes=FACEBOOK_SCOPES,
                status=IntegrationStatus.active,
            )
            db.add(cred)
        await db.flush()
        return cred

    async def _upsert_asset_credential(
        self,
        db: AsyncSession,
        org_id: str,
        account_id: str,
        account_name: str,
        token: str,
        meta: dict,
    ) -> IntegrationCredential:
        """Upsert an Instagram / ad-account credential (non-Page asset)."""
        provider = (
            IntegrationProvider.instagram
            if meta.get("type") == "instagram"
            else IntegrationProvider.facebook
        )
        result = await db.execute(
            select(IntegrationCredential).where(
                IntegrationCredential.org_id == org_id,
                IntegrationCredential.provider == provider,
                IntegrationCredential.external_account_id == account_id,
            )
        )
        cred = result.scalar_one_or_none()
        enc_token = encrypt_token(token)
        if cred:
            cred.access_token_enc = enc_token
            cred.external_account_name = account_name
            cred.status = IntegrationStatus.active
            cred.scopes = FACEBOOK_SCOPES
            cred.meta_json = meta
        else:
            cred = IntegrationCredential(
                org_id=org_id,
                provider=provider,
                access_token_enc=enc_token,
                external_account_id=account_id,
                external_account_name=account_name,
                scopes=FACEBOOK_SCOPES,
                status=IntegrationStatus.active,
                meta_json=meta,
            )
            db.add(cred)
        await db.flush()
        return cred

    async def _ensure_lead_source(self, db: AsyncSession, org_id: str) -> None:
        result = await db.execute(
            select(LeadSource).where(
                LeadSource.org_id == org_id,
                LeadSource.type == LeadSourceType.facebook,
            )
        )
        if not result.scalar_one_or_none():
            db.add(LeadSource(
                org_id=org_id,
                type=LeadSourceType.facebook,
                name="Facebook Lead Ads",
                status=LeadSourceStatus.connected,
            ))
            await db.flush()

    async def _fetch_and_create_lead(
        self, db: AsyncSession, leadgen_id: str, page_id: str
    ) -> Lead:
        """Fetch lead data from Graph API using the stored page token, then create a Lead."""
        # Find credential for this page
        result = await db.execute(
            select(IntegrationCredential).where(
                IntegrationCredential.provider == IntegrationProvider.facebook,
                IntegrationCredential.external_account_id == page_id,
                IntegrationCredential.status == IntegrationStatus.active,
            )
        )
        cred = result.scalar_one_or_none()
        if not cred:
            raise ValueError(f"No active credential for Facebook page {page_id}")

        page_token = decrypt_token(cred.access_token_enc)

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/{leadgen_id}",
                params={"access_token": page_token, "fields": "field_data,created_time,ad_id,form_id"},
            )
            resp.raise_for_status()
            data = resp.json()

        # Normalize field_data [{"name": "full_name", "values": ["John"]}, ...]
        fields: dict[str, str] = {}
        for field in data.get("field_data", []):
            key = field.get("name", "").lower().replace(" ", "_")
            values = field.get("values", [])
            fields[key] = values[0] if values else ""

        name = (
            fields.get("full_name")
            or fields.get("name")
            or f"{fields.get('first_name', '')} {fields.get('last_name', '')}".strip()
            or "Unknown"
        )
        phone = fields.get("phone_number") or fields.get("phone")
        email = fields.get("email")

        # Find the lead source record for this org
        source_result = await db.execute(
            select(LeadSource).where(
                LeadSource.org_id == cred.org_id,
                LeadSource.type == LeadSourceType.facebook,
            )
        )
        source = source_result.scalar_one_or_none()

        lead = Lead(
            org_id=cred.org_id,
            source_id=source.id if source else None,
            name=name,
            phone=phone,
            email=email,
            category=LeadCategory.fresh,
            raw_payload_json=data,
        )
        db.add(lead)
        await db.flush()
        return lead
