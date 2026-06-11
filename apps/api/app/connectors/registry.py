"""
Single source of truth for all social connectors.
A connector is dormant until is_configured() returns True — no code change needed to activate.
"""
from app.connectors.base import SocialConnector
from app.connectors.facebook import FacebookConnector
from app.connectors.instagram import InstagramConnector
from app.connectors.linkedin import LinkedInConnector
from app.connectors.whatsapp import WhatsAppConnector

_registry: dict[str, SocialConnector] = {
    "facebook": FacebookConnector(),
    "instagram": InstagramConnector(),
    "linkedin": LinkedInConnector(),
    "whatsapp": WhatsAppConnector(),
}


def get_connector(provider: str) -> SocialConnector | None:
    return _registry.get(provider)


def all_connectors() -> list[SocialConnector]:
    return list(_registry.values())


def active_connectors() -> list[SocialConnector]:
    return [c for c in _registry.values() if c.is_configured()]
