import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.dependencies import get_active_user, require_any_role, get_visible_user_ids
from app.models.user import User, UserRole
from app.models.lead import Lead, LeadCategory
from app.models.activity import Activity, ActivityType
from app.models.task import Task, TaskStatus
from app.schemas.lead import LeadCreate, LeadUpdate, LeadOut, LeadAssignRequest, ActivityCreate, TaskCreate

router = APIRouter()


@router.get("", response_model=list[LeadOut])
async def list_leads(
    category: LeadCategory | None = None,
    owner_id: uuid.UUID | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [Lead.org_id == current_user.org_id]
    if category:
        filters.append(Lead.category == category)

    # Hierarchy-scoped visibility:
    #   employee -> own leads; head -> own + direct reports; admin -> whole company
    if current_user.role == UserRole.employee:
        filters.append(Lead.owner_id == current_user.id)
    elif current_user.role == UserRole.head:
        visible_ids = await get_visible_user_ids(db, current_user)
        filters.append(Lead.owner_id.in_(visible_ids))
        if owner_id:
            filters.append(Lead.owner_id == owner_id)
    elif owner_id:  # company_admin optional filter
        filters.append(Lead.owner_id == owner_id)

    result = await db.execute(
        select(Lead).where(and_(*filters)).order_by(Lead.created_at.desc()).limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.post("", response_model=LeadOut, status_code=201)
async def create_lead(
    body: LeadCreate,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    lead = Lead(
        org_id=current_user.org_id,
        name=body.name,
        phone=body.phone,
        email=body.email,
        category=LeadCategory.fresh,
    )
    db.add(lead)
    await db.flush()
    return lead


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: uuid.UUID,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.org_id == current_user.org_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: uuid.UUID,
    body: LeadUpdate,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.org_id == current_user.org_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(lead, field, value)
    return lead


@router.post("/{lead_id}/assign")
async def assign_lead(
    lead_id: uuid.UUID,
    body: LeadAssignRequest,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.org_id == current_user.org_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    lead.owner_id = body.owner_id
    return {"lead_id": str(lead_id), "owner_id": str(body.owner_id)}


@router.get("/{lead_id}/activities")
async def get_lead_activities(
    lead_id: uuid.UUID,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Activity)
        .where(Activity.lead_id == lead_id)
        .order_by(Activity.created_at.desc())
        .limit(100)
    )
    activities = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "type": a.type.value,
            "outcome": a.outcome,
            "body": a.body,
            "duration_sec": a.duration_sec,
            "created_at": a.created_at.isoformat(),
        }
        for a in activities
    ]


@router.post("/activities", status_code=201)
async def log_activity(
    body: ActivityCreate,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    activity = Activity(
        lead_id=body.lead_id,
        user_id=current_user.id,
        type=body.type,
        outcome=body.outcome,
        duration_sec=body.duration_sec,
        body=body.body,
        meta_json=body.meta_json,
    )
    db.add(activity)
    # Update last_engaged_at on the lead
    lead_result = await db.execute(select(Lead).where(Lead.id == body.lead_id))
    lead = lead_result.scalar_one_or_none()
    if lead:
        lead.last_engaged_at = datetime.utcnow()
    await db.flush()
    return {"id": str(activity.id)}


@router.post("/tasks", status_code=201)
async def create_task(
    body: TaskCreate,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    task = Task(
        lead_id=body.lead_id,
        assignee_id=current_user.id,
        title=body.title,
        due_at=body.due_at,
        status=TaskStatus.open,
    )
    db.add(task)
    await db.flush()
    return {"id": str(task.id)}


@router.get("/tasks/today")
async def todays_tasks(
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    result = await db.execute(
        select(Task).where(
            Task.assignee_id == current_user.id,
            Task.status == TaskStatus.open,
            Task.due_at >= today_start,
            Task.due_at <= today_end,
        ).order_by(Task.due_at)
    )
    tasks = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "lead_id": str(t.lead_id),
            "title": t.title,
            "due_at": t.due_at.isoformat() if t.due_at else None,
            "status": t.status.value,
        }
        for t in tasks
    ]
