"""
LinkedIn Lead Sync API connector — Phase 1 scaffolding only.

Status: AWAITING_CREDENTIALS
  Requires Marketing Developer Platform / Lead Sync API approval (partner review).
  This connector is code-complete and activates by setting LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET.
  No core code change or redeploy needed when approval arrives.

Key notes:
  - Scope: r_marketing_leadgen_automation (NOT the deprecated r_ads_leadgen_automation)
  - All requests require headers: LinkedIn-Version: YYYYMM, X-Restli-Protocol-Version: 2.0.0
  - Access tokens are time-limited; refresh tokens must be stored and rotated before expiry.
"""
import urllib.parse
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

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_API_BASE = "https://api.linkedin.com/rest"

LINKEDIN_SCOPES = " ".join([
    "r_marketing_leadgen_automation",
    "rw_ads",
    "r_organization_admin",
])


class LinkedInConnector(SocialConnector):

    @property
    def provider(self) -> str:
        return "linkedin"

    def is_configured(self) -> bool:
        return bool(settings.LINKEDIN_CLIENT_ID and settings.LINKEDIN_CLIENT_SECRET)

    def _linkedin_headers(self) -> dict[str, str]:
        return {
            "LinkedIn-Version": settings.LINKEDIN_API_VERSION,
            "X-Restli-Protocol-Version": "2.0.0",
        }

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
        expires_in = token_data.get("expires_in", 5183999)  # ~60 days default

        from datetime import datetime, timedelta
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        result = await db.execute(
            select(IntegrationCredential).where(
                IntegrationCredential.org_id == org_id,
                IntegrationCredential.provider == IntegrationProvider.linkedin,
            )
        )
        cred = result.scalar_one_or_none()
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

    def verify_webhook(self, request: Request) -> str | bool:
        # LinkedIn uses a different notification mechanism; implement when Lead Sync approval arrives
        return True

    async def handle_webhook(self, payload: dict, db: AsyncSession) -> None:
        """
        LinkedIn sends lead notification callbacks; fetch leadFormResponses and create Leads.
        Implement fully when Lead Sync API approval is granted (Phase 2).
        """
        pass
