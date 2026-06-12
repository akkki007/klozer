import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification

router = APIRouter()


@router.get("")
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [Notification.user_id == current_user.id]
    if unread_only:
        filters.append(Notification.is_read.is_(False))
    result = await db.execute(
        select(Notification).where(*filters).order_by(Notification.created_at.desc()).limit(limit)
    )
    notes = result.scalars().all()
    unread = int(
        (
            await db.execute(
                select(func.count(Notification.id)).where(
                    Notification.user_id == current_user.id, Notification.is_read.is_(False)
                )
            )
        ).scalar()
        or 0
    )
    return {
        "unread_count": unread,
        "items": [
            {
                "id": str(n.id),
                "type": n.type.value,
                "title": n.title,
                "body": n.body,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notes
        ],
    }


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == current_user.id
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")
    note.is_read = True
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    return {"ok": True}
