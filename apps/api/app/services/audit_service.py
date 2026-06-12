"""Audit logging for user-management mutations."""
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog, AuditAction


async def record_audit(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    action: AuditAction,
    target_id: uuid.UUID | None = None,
    detail: dict | None = None,
) -> AuditLog:
    """Append an immutable audit entry. Caller's transaction commits it."""
    entry = AuditLog(
        org_id=org_id,
        actor_user_id=actor_id,
        target_user_id=target_id,
        action=action,
        detail_json=detail,
    )
    db.add(entry)
    await db.flush()
    return entry
