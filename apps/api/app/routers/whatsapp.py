"""
WhatsApp inbox — read views over inbound/outbound WhatsApp messages.

GET  /api/whatsapp/conversations              → one row per customer (WhatsApp lead)
GET  /api/whatsapp/conversations/{lead_id}    → full message thread
POST /api/whatsapp/conversations/{lead_id}/read → clear the unread marker

Messages are stored as Activity rows (type=whatsapp) on WhatsApp-source Leads;
see connectors/whatsapp.py for ingestion. The whole org shares one inbox (it's
the company's business line), so views are scoped by org only.
"""
import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_active_user, require_company_admin
from app.models.user import User
from app.models.lead import Lead, LeadSource, LeadSourceType
from app.models.activity import Activity, ActivityType
from app.models.integration import IntegrationCredential, IntegrationProvider, IntegrationStatus
from app.services.crypto_service import encrypt_token

router = APIRouter()


class ManualConnectRequest(BaseModel):
    phone_number_id: str
    access_token: str


class ConnectionOut(BaseModel):
    connected: bool
    phone: str | None = None
    phone_number_id: str | None = None
    name: str | None = None


@router.get("/connection", response_model=ConnectionOut)
async def connection_status(
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Is a WhatsApp number registered for this org?"""
    cred = (
        await db.execute(
            select(IntegrationCredential).where(
                IntegrationCredential.org_id == current_user.org_id,
                IntegrationCredential.provider == IntegrationProvider.whatsapp,
                IntegrationCredential.status == IntegrationStatus.active,
            )
        )
    ).scalar_one_or_none()
    if not cred:
        return ConnectionOut(connected=False)
    meta = cred.meta_json or {}
    return ConnectionOut(
        connected=True,
        phone=meta.get("display_phone"),
        phone_number_id=meta.get("phone_number_id"),
        name=cred.external_account_name,
    )


@router.post("/connect-manual", response_model=ConnectionOut)
async def connect_manual(
    body: ManualConnectRequest,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Register a WhatsApp Cloud API number for this org by pasting its
    Phone number ID + access token (from the Meta WhatsApp 'API Setup' page).
    Best-effort verifies the token and reads the display phone number.
    """
    phone_number_id = body.phone_number_id.strip()
    token = body.access_token.strip()
    if not phone_number_id or not token:
        raise HTTPException(400, "phone_number_id and access_token are required")

    display_phone = None
    verified_name = None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://graph.facebook.com/{settings.META_GRAPH_VERSION}/{phone_number_id}",
                params={"access_token": token, "fields": "display_phone_number,verified_name"},
            )
            if resp.is_success:
                data = resp.json()
                display_phone = data.get("display_phone_number")
                verified_name = data.get("verified_name")
            else:
                raise HTTPException(400, f"Token/phone check failed: {resp.text[:200]}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Could not reach WhatsApp API: {e}")

    meta = {"phone_number_id": phone_number_id, "display_phone": display_phone}
    cred = (
        await db.execute(
            select(IntegrationCredential).where(
                IntegrationCredential.org_id == current_user.org_id,
                IntegrationCredential.provider == IntegrationProvider.whatsapp,
            )
        )
    ).scalar_one_or_none()
    if cred:
        cred.access_token_enc = encrypt_token(token)
        cred.external_account_name = verified_name or display_phone or "WhatsApp"
        cred.status = IntegrationStatus.active
        cred.meta_json = meta
    else:
        cred = IntegrationCredential(
            org_id=current_user.org_id,
            provider=IntegrationProvider.whatsapp,
            access_token_enc=encrypt_token(token),
            external_account_id=phone_number_id,
            external_account_name=verified_name or display_phone or "WhatsApp",
            status=IntegrationStatus.active,
            meta_json=meta,
        )
        db.add(cred)
    await db.commit()

    return ConnectionOut(
        connected=True,
        phone=display_phone,
        phone_number_id=phone_number_id,
        name=verified_name or display_phone,
    )


class ConversationOut(BaseModel):
    lead_id: str
    name: str
    phone: str | None
    last_message: str | None
    last_message_at: str | None
    last_direction: str | None
    unread: int
    total: int


class MessageOut(BaseModel):
    id: str
    direction: str
    body: str | None
    wa_type: str
    status: str | None
    created_at: str | None


async def _wa_lead_ids(db: AsyncSession, org_id) -> list:
    """Lead ids whose source is WhatsApp, for this org."""
    result = await db.execute(
        select(Lead.id)
        .join(LeadSource, Lead.source_id == LeadSource.id)
        .where(Lead.org_id == org_id, LeadSource.type == LeadSourceType.whatsapp)
    )
    return [r[0] for r in result.all()]


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    lead_ids = await _wa_lead_ids(db, current_user.org_id)
    if not lead_ids:
        return []

    leads = (await db.execute(select(Lead).where(Lead.id.in_(lead_ids)))).scalars().all()

    conversations: list[ConversationOut] = []
    for lead in leads:
        acts = (
            await db.execute(
                select(Activity)
                .where(Activity.lead_id == lead.id, Activity.type == ActivityType.whatsapp)
                .order_by(Activity.created_at.desc())
            )
        ).scalars().all()
        if not acts:
            continue

        last = acts[0]
        read_marker = lead.wa_last_read_at
        unread = sum(
            1
            for a in acts
            if (a.meta_json or {}).get("direction") == "in"
            and (read_marker is None or (a.created_at and a.created_at > read_marker))
        )
        conversations.append(ConversationOut(
            lead_id=str(lead.id),
            name=lead.name,
            phone=lead.phone,
            last_message=last.body,
            last_message_at=last.created_at.isoformat() if last.created_at else None,
            last_direction=(last.meta_json or {}).get("direction"),
            unread=unread,
            total=len(acts),
        ))

    conversations.sort(key=lambda c: c.last_message_at or "", reverse=True)
    return conversations


@router.get("/conversations/{lead_id}", response_model=list[MessageOut])
async def conversation_messages(
    lead_id: str,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        lid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(400, "Invalid conversation id")

    lead = (
        await db.execute(select(Lead).where(Lead.id == lid, Lead.org_id == current_user.org_id))
    ).scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Conversation not found")

    acts = (
        await db.execute(
            select(Activity)
            .where(Activity.lead_id == lid, Activity.type == ActivityType.whatsapp)
            .order_by(Activity.created_at.asc())
        )
    ).scalars().all()

    return [
        MessageOut(
            id=str(a.id),
            direction=(a.meta_json or {}).get("direction", "out"),
            body=a.body,
            wa_type=(a.meta_json or {}).get("wa_type", "text"),
            status=(a.meta_json or {}).get("status"),
            created_at=a.created_at.isoformat() if a.created_at else None,
        )
        for a in acts
    ]


@router.post("/conversations/{lead_id}/read", status_code=204)
async def mark_conversation_read(
    lead_id: str,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        lid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(400, "Invalid conversation id")
    lead = (
        await db.execute(select(Lead).where(Lead.id == lid, Lead.org_id == current_user.org_id))
    ).scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Conversation not found")
    lead.wa_last_read_at = datetime.utcnow()
    await db.commit()
