"""
Instagram Lead Ads connector.

Instagram lead forms run through the same Meta app and leadgen webhook as Facebook.
This connector is a thin variant — same OAuth flow, same webhook, different provider tag.
Low marginal cost once FacebookConnector is working.

Activate: set FB_APP_ID + FB_APP_SECRET (same env vars as Facebook).
"""
from typing import Any
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.connectors.facebook import FacebookConnector, FACEBOOK_SCOPES
from app.models.lead import LeadSourceType


class InstagramConnector(FacebookConnector):
    """
    Inherits the full Facebook OAuth + webhook flow.
    Instagram leads arrive via the same leadgen webhook on the connected Facebook Page.
    The provider tag is overridden for credential storage + UI display.
    """

    @property
    def provider(self) -> str:
        return "instagram"

    def is_configured(self) -> bool:
        # Shares the Meta app — active when Facebook credentials are present
        return bool(settings.FB_APP_ID and settings.FB_APP_SECRET)

    async def handle_webhook(self, payload: dict, db: AsyncSession) -> None:
        # Instagram leads arrive through the Facebook leadgen webhook on the connected page.
        # Delegate to parent; the source_type on the Lead will be set to instagram where identifiable.
        await super().handle_webhook(payload, db)
