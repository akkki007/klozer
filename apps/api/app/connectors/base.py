from abc import ABC, abstractmethod
from typing import Any
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


class SocialConnector(ABC):
    """
    Every provider implements this interface.
    A connector is dormant until isConfigured() returns True.
    Dropping env credentials is the only action needed to go live.
    """

    @property
    @abstractmethod
    def provider(self) -> str:
        ...

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True only if all required env vars are set."""
        ...

    @abstractmethod
    def get_auth_url(self, org_id: str, state: str) -> str | None:
        """Returns the provider OAuth authorization URL, or None if not configured."""
        ...

    @abstractmethod
    async def handle_callback(self, org_id: str, code: str, db: AsyncSession) -> dict[str, Any]:
        """Exchange OAuth code for tokens; store encrypted credential; return metadata."""
        ...

    @abstractmethod
    def verify_webhook(self, request: Request) -> str | bool:
        """
        For Meta: return hub.challenge string on GET verification.
        For POST: verify X-Hub-Signature-256, return True if valid.
        """
        ...

    @abstractmethod
    async def handle_webhook(self, payload: dict, db: AsyncSession) -> None:
        """Normalize the inbound event → create/update Lead → enqueue distribution."""
        ...
