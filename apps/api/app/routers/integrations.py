"""
Integration routes — shared shape for all providers.

GET  /api/integrations                    → list all providers + status
GET  /api/integrations/:provider/connect  → redirect to provider OAuth URL
GET  /api/integrations/:provider/callback → exchange code, store tokens
POST /api/integrations/whatsapp/callback  → Embedded Signup code exchange (WA only)
DELETE /api/integrations/:provider        → revoke / disconnect
POST /api/engagement/whatsapp/send        → send approved template message
"""
import hashlib
import hmac
import secrets
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.integration import IntegrationCredential, IntegrationProvider, IntegrationStatus
from app.connectors.registry import get_connector, all_connectors
from app.schemas.integration import (
    IntegrationStatusOut,
    WhatsAppSendRequest,
    AssetDiscoveryOut,
    InstallRequest,
    InstalledProfileOut,
    ProfileDetailOut,
)
from app.services.crypto_service import encrypt_token, decrypt_token
from app.models.activity import Activity, ActivityType
from app.models.lead import Lead

# Meta providers use the two-phase discover → install flow.
META_PROVIDERS = {"facebook", "instagram"}
PENDING_TYPE = "user_pending"

router = APIRouter()

# ─── Simple signed state for CSRF protection ─────────────────────────────────

def _make_state(org_id: str) -> str:
    nonce = secrets.token_urlsafe(16)
    raw = f"{org_id}:{nonce}"
    sig = hmac.new(settings.JWT_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}:{sig}"


def _verify_state(state: str) -> str:
    """Returns org_id if valid, raises ValueError otherwise."""
    parts = state.rsplit(":", 1)
    if len(parts) != 2:
        raise ValueError("Invalid state")
    raw, sig = parts
    expected = hmac.new(settings.JWT_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise ValueError("State signature mismatch — possible CSRF")
    return raw.split(":")[0]  # org_id


# ─── Pending user-token (the OAuth "session" used for discover → install) ─────

def _pending_account_id(fb_user_id: str) -> str:
    return f"user:{fb_user_id}"


async def _store_pending_user_token(
    db: AsyncSession, org_id: str, provider: str, token: str, fb_user_id: str
) -> None:
    """Persist the long-lived user token between the discover and install phases."""
    account_id = _pending_account_id(fb_user_id)
    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.org_id == org_id,
            IntegrationCredential.provider == provider,
            IntegrationCredential.external_account_id == account_id,
        )
    )
    cred = result.scalar_one_or_none()
    if cred:
        cred.access_token_enc = encrypt_token(token)
        cred.status = IntegrationStatus.pending
    else:
        db.add(IntegrationCredential(
            org_id=org_id,
            provider=provider,
            access_token_enc=encrypt_token(token),
            external_account_id=account_id,
            external_account_name="Meta account",
            status=IntegrationStatus.pending,
            meta_json={"type": PENDING_TYPE, "fb_user_id": fb_user_id},
        ))
    await db.commit()


async def _get_pending_user_token(db: AsyncSession, org_id: str, provider: str) -> str | None:
    """Return the most recent decrypted pending user token for an org + provider."""
    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.org_id == org_id,
            IntegrationCredential.provider == provider,
            IntegrationCredential.status == IntegrationStatus.pending,
        ).order_by(IntegrationCredential.updated_at.desc())
    )
    cred = result.scalars().first()
    return decrypt_token(cred.access_token_enc) if cred else None


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[IntegrationStatusOut])
async def list_integrations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(IntegrationCredential).where(IntegrationCredential.org_id == current_user.org_id)
    )
    # Exclude the transient pending user-token rows — they aren't installed assets.
    creds_by_provider = {
        c.provider.value: c
        for c in result.scalars().all()
        if not (c.meta_json or {}).get("type") == PENDING_TYPE
    }

    statuses = []
    for connector in all_connectors():
        cred = creds_by_provider.get(connector.provider)
        if not connector.is_configured():
            st = "awaiting_credentials"
        elif not cred:
            st = "scaffolded"
        elif cred.status == IntegrationStatus.active:
            st = "active"
        else:
            st = cred.status.value

        statuses.append(IntegrationStatusOut(
            provider=connector.provider,
            configured=connector.is_configured(),
            status=st,
            account=cred.external_account_name if cred else None,
        ))
    return statuses


@router.get("/{provider}/connect")
async def connect_provider(
    provider: str,
    current_user: User = Depends(require_admin),
):
    """Return the OAuth URL for the provider. Frontend handles the redirect."""
    connector = get_connector(provider)
    if not connector:
        raise HTTPException(404, f"Unknown provider: {provider}")
    if not connector.is_configured():
        raise HTTPException(409, {"status": "awaiting_credentials", "provider": provider})

    state = _make_state(str(current_user.org_id))

    if provider == "whatsapp":
        return {
            "method": "embedded_signup",
            "app_id": settings.FB_APP_ID,
            "configuration_id": settings.WHATSAPP_CONFIGURATION_ID,
            "state": state,
        }

    auth_url = connector.get_auth_url(str(current_user.org_id), state)
    return {"auth_url": auth_url}


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        org_id = _verify_state(state)
    except ValueError as e:
        raise HTTPException(400, str(e))

    connector = get_connector(provider)
    if not connector:
        raise HTTPException(404, f"Unknown provider: {provider}")

    # Meta providers: don't install yet — stash the user token and let the user
    # pick which Pages / IG accounts / ad accounts to install in the UI.
    if provider in META_PROVIDERS:
        try:
            user_token, fb_user_id = await connector.exchange_for_user_token(code)
            await _store_pending_user_token(db, org_id, provider, user_token, fb_user_id)
        except Exception as e:
            raise HTTPException(500, f"OAuth exchange failed: {e}")
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/integrations/oauth-bridge?provider={provider}",
            status_code=302,
        )

    # Other providers (e.g. LinkedIn): single-token install, no asset selection.
    try:
        await connector.handle_callback(org_id, code, db)
    except Exception as e:
        raise HTTPException(500, f"OAuth callback failed: {e}")

    return RedirectResponse(
        f"{settings.FRONTEND_URL}/integrations/oauth-bridge?provider={provider}&status=connected",
        status_code=302,
    )


@router.get("/{provider}/assets", response_model=AssetDiscoveryOut)
async def discover_assets(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Phase 2: list everything the granted token can access, for the user to pick from."""
    if provider not in META_PROVIDERS:
        raise HTTPException(400, f"{provider} does not support asset selection")
    connector = get_connector(provider)
    if not connector:
        raise HTTPException(404, f"Unknown provider: {provider}")

    token = await _get_pending_user_token(db, str(current_user.org_id), provider)
    if not token:
        raise HTTPException(409, {"status": "no_pending_session", "provider": provider})

    try:
        assets = await connector.discover_assets(token)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch assets: {e}")
    return AssetDiscoveryOut(provider=provider, **assets)


@router.post("/{provider}/install", response_model=list[InstalledProfileOut])
async def install_assets(
    provider: str,
    body: InstallRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Phase 3: persist the chosen assets as active credentials."""
    if provider not in META_PROVIDERS:
        raise HTTPException(400, f"{provider} does not support asset selection")
    connector = get_connector(provider)
    if not connector:
        raise HTTPException(404, f"Unknown provider: {provider}")

    token = await _get_pending_user_token(db, str(current_user.org_id), provider)
    if not token:
        raise HTTPException(409, {"status": "no_pending_session", "provider": provider})

    selected = [a.model_dump() for a in body.assets]
    try:
        await connector.install_assets(str(current_user.org_id), selected, token, db)
    except Exception as e:
        raise HTTPException(502, f"Install failed: {e}")

    return await _list_profiles(db, current_user.org_id)


@router.get("/profiles", response_model=list[InstalledProfileOut])
async def list_profiles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """All installed social profiles for the org (right-hand pane)."""
    return await _list_profiles(db, current_user.org_id)


async def _list_profiles(db: AsyncSession, org_id) -> list[InstalledProfileOut]:
    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.org_id == org_id,
            IntegrationCredential.status == IntegrationStatus.active,
        ).order_by(IntegrationCredential.created_at.asc())
    )
    profiles: list[InstalledProfileOut] = []
    for c in result.scalars().all():
        meta = c.meta_json or {}
        if meta.get("type") == PENDING_TYPE:
            continue
        profiles.append(InstalledProfileOut(
            id=str(c.id),
            provider=c.provider.value,
            type=meta.get("type") or c.provider.value,
            name=c.external_account_name,
            picture=meta.get("picture"),
            account_id=c.external_account_id,
            status=c.status.value,
        ))
    return profiles


@router.get("/profiles/{cred_id}", response_model=ProfileDetailOut)
async def profile_detail(
    cred_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full info for one connected profile, plus a best-effort live fetch."""
    try:
        cid = uuid.UUID(cred_id)
    except ValueError:
        raise HTTPException(400, "Invalid credential id")
    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.id == cid,
            IntegrationCredential.org_id == current_user.org_id,
        )
    )
    cred = result.scalar_one_or_none()
    meta = cred.meta_json or {} if cred else {}
    if not cred or meta.get("type") == PENDING_TYPE:
        raise HTTPException(404, "Profile not found")

    atype = meta.get("type") or cred.provider.value
    # scopes are stored comma- (Meta) or space- (LinkedIn) separated
    raw_scopes = (cred.scopes or "").replace(",", " ").split()

    live, live_error = None, None
    connector = get_connector(cred.provider.value)
    if connector and hasattr(connector, "fetch_asset_details") and cred.external_account_id:
        try:
            token = decrypt_token(cred.access_token_enc)
            live = await connector.fetch_asset_details(token, cred.external_account_id, atype)
        except Exception as e:
            live_error = str(e)[:300]

    return ProfileDetailOut(
        id=str(cred.id),
        provider=cred.provider.value,
        type=atype,
        name=cred.external_account_name,
        picture=meta.get("picture"),
        account_id=cred.external_account_id,
        status=cred.status.value,
        scopes=sorted(set(raw_scopes)),
        leadgen_subscribed=meta.get("leadgen_subscribed"),
        created_at=cred.created_at.isoformat() if cred.created_at else None,
        updated_at=cred.updated_at.isoformat() if cred.updated_at else None,
        expires_at=cred.expires_at.isoformat() if cred.expires_at else None,
        meta={k: v for k, v in meta.items() if k not in ("picture",)},
        live=live,
        live_error=live_error,
    )


@router.delete("/profiles/{cred_id}", status_code=204)
async def disconnect_profile(
    cred_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect a single installed profile by credential id."""
    try:
        cid = uuid.UUID(cred_id)
    except ValueError:
        raise HTTPException(400, "Invalid credential id")
    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.id == cid,
            IntegrationCredential.org_id == current_user.org_id,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Profile not found")
    cred.status = IntegrationStatus.revoked
    await db.commit()
    return Response(status_code=204)


@router.post("/whatsapp/callback")
async def whatsapp_embedded_callback(
    request: Request,
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Receive the short-lived code from the frontend Embedded Signup popup."""
    try:
        org_id = _verify_state(state)
    except ValueError as e:
        raise HTTPException(400, str(e))

    body = await request.json()
    code = body.get("code")
    if not code:
        raise HTTPException(400, "Missing code from Embedded Signup")

    connector = get_connector("whatsapp")
    result = await connector.handle_callback(org_id, code, db)
    return result


@router.delete("/{provider}", status_code=204)
async def disconnect_provider(
    provider: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(IntegrationCredential).where(
            and_(
                IntegrationCredential.org_id == current_user.org_id,
                IntegrationCredential.provider == provider,
            )
        )
    )
    for cred in result.scalars().all():
        cred.status = IntegrationStatus.revoked
    return Response(status_code=204)


# ─── WhatsApp outbound send ───────────────────────────────────────────────────

@router.post("/whatsapp/send", status_code=201)
async def send_whatsapp(
    body: WhatsAppSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead_result = await db.execute(
        select(Lead).where(Lead.id == uuid.UUID(body.lead_id), Lead.org_id == current_user.org_id)
    )
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not lead.phone:
        raise HTTPException(400, "Lead has no phone number")

    from app.connectors.whatsapp import WhatsAppConnector
    wa = WhatsAppConnector()
    if not wa.is_configured():
        raise HTTPException(409, "WhatsApp not configured")

    try:
        send_result = await wa.send_template(
            org_id=str(current_user.org_id),
            to_phone=lead.phone,
            template_name=body.template_name,
            language_code=body.language_code,
            components=body.components,
            db=db,
        )
    except Exception as e:
        raise HTTPException(500, str(e))

    # Log as activity
    msg_id = send_result.get("messages", [{}])[0].get("id")
    activity = Activity(
        lead_id=lead.id,
        user_id=current_user.id,
        type=ActivityType.whatsapp,
        body=f"Template: {body.template_name}",
        external_id=msg_id,
        meta_json={"template": body.template_name, "to": lead.phone},
    )
    db.add(activity)
    return {"message_id": msg_id, "status": "sent"}
