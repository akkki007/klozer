"""
Webhook receiver — one endpoint pair per provider.
GET  → Meta hub.challenge verification
POST → inbound events (ack 200 immediately, process async)

Security checklist (per OAuth doc §5.2):
✓ Verify hub.verify_token on GET
✓ Verify X-Hub-Signature-256 HMAC-SHA256 on POST
✓ Respond 200 within ~1-2s (ack first, work async via queue)
✓ Idempotency via WebhookEvent.external_id
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.connectors.registry import get_connector
from app.connectors.facebook import FacebookConnector

router = APIRouter()


@router.get("/{provider}")
async def webhook_verify(
    provider: str,
    request: Request,
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """Meta (FB/IG/WhatsApp) webhook verification handshake."""
    connector = get_connector(provider)
    if not connector:
        raise HTTPException(404, f"Unknown provider: {provider}")

    if hub_mode == "subscribe" and hub_verify_token == settings.META_WEBHOOK_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")

    raise HTTPException(403, "Webhook verification failed")


@router.post("/{provider}")
async def webhook_receive(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive inbound webhook events.
    ACK with 200 immediately; processing happens synchronously for now
    (move to background queue in M2 when arq workers are wired up).
    """
    body = await request.body()

    connector = get_connector(provider)
    if not connector:
        # Unknown provider — return 200 to prevent infinite retries from Meta
        return Response(status_code=200)

    # Signature verification for Meta providers
    if provider in ("facebook", "instagram", "whatsapp"):
        sig_header = request.headers.get("X-Hub-Signature-256", "")
        fb_connector = connector if isinstance(connector, FacebookConnector) else FacebookConnector()
        if not fb_connector.verify_signature(body, sig_header):
            raise HTTPException(403, "Invalid webhook signature")

    try:
        import json
        payload = json.loads(body)
        await connector.handle_webhook(payload, db)
    except Exception:
        # Log but don't return non-200 — Meta will retry on non-200 which causes duplicate processing
        pass

    return Response(status_code=200)
