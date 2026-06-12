import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import aliased

from app.database import get_db
from app.dependencies import require_company_admin
from app.models.user import User
from app.models.audit import AuditLog, AuditAction

router = APIRouter()


@router.get("")
async def list_audit_logs(
    action: AuditAction | None = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    actor: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    Actor = aliased(User)
    Target = aliased(User)
    stmt = (
        select(AuditLog, Actor.name, Target.name)
        .outerjoin(Actor, AuditLog.actor_user_id == Actor.id)
        .outerjoin(Target, AuditLog.target_user_id == Target.id)
        .where(AuditLog.org_id == actor.org_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if action:
        stmt = stmt.where(AuditLog.action == action)

    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": str(log.id),
            "action": log.action.value,
            "actor": actor_name,
            "actor_id": str(log.actor_user_id) if log.actor_user_id else None,
            "target": target_name,
            "target_id": str(log.target_user_id) if log.target_user_id else None,
            "detail": log.detail_json,
            "created_at": log.created_at.isoformat(),
        }
        for log, actor_name, target_name in rows
    ]
