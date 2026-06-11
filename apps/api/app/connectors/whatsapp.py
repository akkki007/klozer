"""
WhatsApp Cloud API connector — outbound templates (Phase 1).

Connection path: Meta Embedded Signup (Facebook Login for Business).
  - NOT a lead source. This is a messaging channel.
  - Phase 1: outbound approved templates only.
  - Phase 2: inbound replies, status callbacks.

Activate: set FB_APP_ID + FB_APP_SECRET + WHATSAPP_CONFIGURATION_ID.
The frontend triggers the FB JS SDK Embedded Signup popup; the resulting short-lived code
is POSTed to /api/integrations/whatsapp/callback (handled here).
"""
import hashlib
import hmac
from typing import Any

import httpx
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.connectors.base import SocialConnector
from app.models.integration import IntegrationCredential, IntegrationProvider, IntegrationStatus
from app.services.crypto_service import encrypt_token, decrypt_token

GRAPH_BASE = "https://graph.facebook.com"


class WhatsAppConnector(SocialConnector):

    @property
    def provider(self) -> str:
        return "whatsapp"

    def is_configured(self) -> bool:
        return bool(
            settings.FB_APP_ID
            and settings.FB_APP_SECRET
            and settings.WHATSAPP_CONFIGURATION_ID
        )

    def get_auth_url(self, org_id: str, state: str) -> str | None:
        """
        WhatsApp uses Embedded Signup (FB JS SDK in the browser), not a server-side redirect.
        This returns None; the frontend handles the popup directly.
        See: apps/web/src/components/integrations/WhatsAppConnect.tsx
        """
        return None

    async def handle_callback(self, org_id: str, code: str, db: AsyncSession) -> dict[str, Any]:
        """
        Exchange the short-lived code from Embedded Signup (~10 min expiry).
        Then read WABA id and phone number id from the Graph API.
        """
        async with httpx.AsyncClient() as client:
            # Exchange code → access token
            resp = await client.get(
                f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/oauth/access_token",
                params={
                    "client_id": settings.FB_APP_ID,
                    "client_secret": settings.FB_APP_SECRET,
                    "code": code,
                },
            )
            resp.raise_for_status()
            token_data = resp.json()
            access_token = token_data["access_token"]

            # Read WABA id from /me?fields=granular_scopes (or via the WABA API)
            waba_resp = await client.get(
                f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/me/businesses",
                params={"access_token": access_token, "fields": "id,name"},
            )
            waba_data = waba_resp.json().get("data", [{}])[0] if waba_resp.is_success else {}
            waba_id = waba_data.get("id")
            waba_name = waba_data.get("name")

            # Get phone numbers linked to WABA
            phone_resp = await client.get(
                f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/{waba_id}/phone_numbers",
                params={"access_token": access_token, "fields": "id,display_phone_number,verified_name"},
            ) if waba_id else None
            phone_data = phone_resp.json().get("data", [{}])[0] if (phone_resp and phone_resp.is_success) else {}
            phone_number_id = phone_data.get("id")
            display_phone = phone_data.get("display_phone_number")

        result = await db.execute(
            select(IntegrationCredential).where(
                IntegrationCredential.org_id == org_id,
                IntegrationCredential.provider == IntegrationProvider.whatsapp,
            )
        )
        cred = result.scalar_one_or_none()
        meta = {"phone_number_id": phone_number_id, "display_phone": display_phone, "waba_id": waba_id}
        if cred:
            cred.access_token_enc = encrypt_token(access_token)
            cred.external_account_id = waba_id
            cred.external_account_name = waba_name or display_phone
            cred.status = IntegrationStatus.active
            cred.meta_json = meta
        else:
            cred = IntegrationCredential(
                org_id=org_id,
                provider=IntegrationProvider.whatsapp,
                access_token_enc=encrypt_token(access_token),
                external_account_id=waba_id,
                external_account_name=waba_name or display_phone,
                status=IntegrationStatus.active,
                meta_json=meta,
            )
            db.add(cred)

        await db.commit()
        return {"provider": "whatsapp", "phone": display_phone, "status": "connected"}

    def verify_signature(self, body: bytes, signature_header: str) -> bool:
        if not signature_header.startswith("sha256="):
            return False
        expected = hmac.new(
            settings.FB_APP_SECRET.encode(), body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature_header.removeprefix("sha256="))

    def verify_webhook(self, request: Request) -> str | bool:
        return request.headers.get("X-Hub-Signature-256", "")

    async def handle_webhook(self, payload: dict, db: AsyncSession) -> None:
        """Phase 2: process inbound messages and status callbacks."""
        pass

    async def send_template(
        self,
        org_id: str,
        to_phone: str,
        template_name: str,
        language_code: str,
        components: list[dict],
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Send an approved WhatsApp template message to a lead's phone number."""
        result = await db.execute(
            select(IntegrationCredential).where(
                IntegrationCredential.org_id == org_id,
                IntegrationCredential.provider == IntegrationProvider.whatsapp,
                IntegrationCredential.status == IntegrationStatus.active,
            )
        )
        cred = result.scalar_one_or_none()
        if not cred:
            raise ValueError("WhatsApp not connected for this org")

        access_token = decrypt_token(cred.access_token_enc)
        phone_number_id = (cred.meta_json or {}).get("phone_number_id")
        if not phone_number_id:
            raise ValueError("phone_number_id not stored — reconnect WhatsApp")

        # Normalize to E.164 (remove spaces/dashes; assume + prefix from caller)
        to_e164 = "".join(c for c in to_phone if c.isdigit() or c == "+")

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GRAPH_BASE}/{settings.META_GRAPH_VERSION}/{phone_number_id}/messages",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": to_e164,
                    "type": "template",
                    "template": {
                        "name": template_name,
                        "language": {"code": language_code},
                        "components": components,
                    },
                },
            )
            resp.raise_for_status()
            return resp.json()
