from datetime import datetime, date
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_active_user, get_visible_user_ids
from app.models.user import User, UserRole, UserStatus
from app.models.lead import Lead
from app.models.deal import Deal, DealStatus
from app.models.task import Task, TaskStatus

router = APIRouter()


async def _count(db: AsyncSession, stmt) -> int:
    return int((await db.execute(stmt)).scalar() or 0)


@router.get("")
async def dashboard(
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Role-aware dashboard metrics for the signed-in user."""
    org_id = current_user.org_id
    role = current_user.role

    if role == UserRole.company_admin:
        total_heads = await _count(
            db, select(func.count(User.id)).where(User.org_id == org_id, User.role == UserRole.head)
        )
        total_employees = await _count(
            db, select(func.count(User.id)).where(User.org_id == org_id, User.role == UserRole.employee)
        )
        active_users = await _count(
            db, select(func.count(User.id)).where(User.org_id == org_id, User.status == UserStatus.active)
        )
        total_leads = await _count(db, select(func.count(Lead.id)).where(Lead.org_id == org_id))
        conversions = await _count(
            db,
            select(func.count(Deal.id))
            .join(Lead, Deal.lead_id == Lead.id)
            .where(Lead.org_id == org_id, Deal.status == DealStatus.won),
        )
        revenue = float(
            (
                await db.execute(
                    select(func.coalesce(func.sum(Deal.value), 0))
                    .join(Lead, Deal.lead_id == Lead.id)
                    .where(Lead.org_id == org_id, Deal.status == DealStatus.won)
                )
            ).scalar()
            or 0
        )
        return {
            "role": role.value,
            "cards": {
                "total_heads": total_heads,
                "total_employees": total_employees,
                "active_users": active_users,
                "leads": total_leads,
                "conversions": conversions,
                "revenue": revenue,
            },
        }

    if role == UserRole.head:
        team_ids = await get_visible_user_ids(db, current_user)
        report_ids = [i for i in team_ids if i != current_user.id]
        team_size = len(report_ids)
        team_leads = await _count(
            db, select(func.count(Lead.id)).where(Lead.org_id == org_id, Lead.owner_id.in_(team_ids))
        )
        conversions = await _count(
            db,
            select(func.count(Deal.id))
            .join(Lead, Deal.lead_id == Lead.id)
            .where(Lead.org_id == org_id, Lead.owner_id.in_(team_ids), Deal.status == DealStatus.won),
        )
        followups_pending = await _count(
            db,
            select(func.count(Task.id)).where(
                Task.assignee_id.in_(team_ids), Task.status == TaskStatus.open
            ),
        )
        return {
            "role": role.value,
            "cards": {
                "team_size": team_size,
                "team_leads": team_leads,
                "conversions": conversions,
                "followups_pending": followups_pending,
            },
        }

    # Employee
    assigned_leads = await _count(
        db, select(func.count(Lead.id)).where(Lead.org_id == org_id, Lead.owner_id == current_user.id)
    )
    open_tasks = await _count(
        db,
        select(func.count(Task.id)).where(
            Task.assignee_id == current_user.id, Task.status == TaskStatus.open
        ),
    )
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    followups = await _count(
        db,
        select(func.count(Task.id)).where(
            Task.assignee_id == current_user.id,
            Task.status == TaskStatus.open,
            Task.due_at >= today_start,
            Task.due_at <= today_end,
        ),
    )
    won = await _count(
        db,
        select(func.count(Deal.id))
        .join(Lead, Deal.lead_id == Lead.id)
        .where(Lead.owner_id == current_user.id, Deal.status == DealStatus.won),
    )
    conversion_rate = round((won / assigned_leads) * 100, 1) if assigned_leads else 0.0
    return {
        "role": role.value,
        "cards": {
            "assigned_leads": assigned_leads,
            "tasks": open_tasks,
            "followups": followups,
            "conversion_rate": conversion_rate,
        },
    }
