import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_service import decode_access_token

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def get_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Like get_current_user but blocks access until a temporary password has
    been changed. Use this on every protected router EXCEPT the change-password
    and /me endpoints (which the user must reach while the flag is still set).
    """
    if current_user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required",
        )
    return current_user


def require_roles(*roles: UserRole):
    async def _check(current_user: User = Depends(get_active_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return _check


# Shorthand role dependencies (all imply password already changed)
require_company_admin = require_roles(UserRole.company_admin)
require_head_or_admin = require_roles(UserRole.company_admin, UserRole.head)
require_any_role = require_roles(UserRole.company_admin, UserRole.head, UserRole.employee)


async def get_visible_user_ids(db: AsyncSession, user: User) -> list[uuid.UUID]:
    """User ids whose data (leads, etc.) ``user`` is allowed to see.

    - company_admin: everyone in the company
    - head: themselves + their direct reports
    - employee: only themselves
    """
    if user.role == UserRole.company_admin:
        result = await db.execute(select(User.id).where(User.org_id == user.org_id))
        return list(result.scalars().all())
    if user.role == UserRole.head:
        result = await db.execute(
            select(User.id).where(
                User.org_id == user.org_id,
                (User.manager_id == user.id) | (User.id == user.id),
            )
        )
        return list(result.scalars().all())
    return [user.id]
