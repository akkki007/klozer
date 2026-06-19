"""
LinkedIn integration — organization selection, lead-gen sync, campaign analytics.

GET  /api/linkedin/status         → connection + selected organization
GET  /api/linkedin/organizations  → Pages the connected member administers
POST /api/linkedin/select-organization  → store the chosen Page
POST /api/linkedin/sync           → pull lead-gen form responses into Leads
GET  /api/linkedin/analytics      → campaign performance for the dashboard

Data endpoints require the LinkedIn products (Lead Sync / Advertising / Community
Management) to be provisioned; until then LinkedIn returns 403 and these surface a
clear "needs_access" error.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_active_user, require_company_admin
from app.models.user import User
from app.models.integration import IntegrationCredential, IntegrationProvider, IntegrationStatus
from app.models.lead import Lead, LeadSource, LeadSourceType
from app.connectors.linkedin import LinkedInConnector

router = APIRouter()
connector = LinkedInConnector()


class SelectOrgRequest(BaseModel):
    urn: str
    name: str
    logo: str | None = None
    website: str | None = None
    industry: str | None = None
    followers: int | None = None


class StatusOut(BaseModel):
    configured: bool
    connected: bool
    organization: dict | None = None
    lead_count: int = 0


async def _cred(db: AsyncSession, org_id) -> IntegrationCredential | None:
    return (await db.execute(select(IntegrationCredential).where(
        IntegrationCredential.org_id == org_id,
        IntegrationCredential.provider == IntegrationProvider.linkedin,
        IntegrationCredential.status == IntegrationStatus.active,
    ))).scalar_one_or_none()


def _needs_access(detail: str = "") -> HTTPException:
    return HTTPException(409, {"status": "needs_access",
                              "message": "LinkedIn product access is still pending approval.",
                              "detail": detail[:300]})


@router.get("/status", response_model=StatusOut)
async def status(current_user: User = Depends(get_active_user), db: AsyncSession = Depends(get_db)):
    cred = await _cred(db, current_user.org_id)
    lead_count = (await db.execute(
        select(func.count(Lead.id)).join(LeadSource, Lead.source_id == LeadSource.id)
        .where(Lead.org_id == current_user.org_id, LeadSource.type == LeadSourceType.linkedin)
    )).scalar() or 0
    return StatusOut(
        configured=connector.is_configured(),
        connected=cred is not None,
        organization=(cred.meta_json or {}).get("organization") if cred else None,
        lead_count=lead_count,
    )


@router.get("/organizations")
async def organizations(current_user: User = Depends(require_company_admin), db: AsyncSession = Depends(get_db)):
    cred = await _cred(db, current_user.org_id)
    if not cred:
        raise HTTPException(409, "LinkedIn not connected")
    token = await connector.valid_token(db, cred)
    try:
        return await connector.fetch_organizations(token)
    except Exception as e:
        raise _needs_access(str(e))


@router.post("/select-organization", response_model=StatusOut)
async def select_organization(
    body: SelectOrgRequest,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    cred = await _cred(db, current_user.org_id)
    if not cred:
        raise HTTPException(409, "LinkedIn not connected")
    meta = dict(cred.meta_json or {})
    meta["organization"] = body.model_dump()
    cred.meta_json = meta
    await db.commit()
    return await status(current_user, db)


@router.post("/sync")
async def sync(current_user: User = Depends(require_company_admin), db: AsyncSession = Depends(get_db)):
    cred = await _cred(db, current_user.org_id)
    if not cred:
        raise HTTPException(409, "LinkedIn not connected")
    org = (cred.meta_json or {}).get("organization")
    if not org:
        raise HTTPException(409, "Select an organization first")
    token = await connector.valid_token(db, cred)
    try:
        return await connector.sync_lead_responses(current_user.org_id, token, org["urn"], db)
    except Exception as e:
        raise _needs_access(str(e))


@router.get("/analytics")
async def analytics(current_user: User = Depends(get_active_user), db: AsyncSession = Depends(get_db)):
    cred = await _cred(db, current_user.org_id)
    if not cred:
        raise HTTPException(409, "LinkedIn not connected")
    org = (cred.meta_json or {}).get("organization")
    if not org:
        raise HTTPException(409, "Select an organization first")
    token = await connector.valid_token(db, cred)
    try:
        return await connector.fetch_campaign_analytics(token, org["urn"])
    except Exception as e:
        raise _needs_access(str(e))
