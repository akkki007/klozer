import re
from datetime import datetime, timedelta
from typing import Any, TYPE_CHECKING
import bcrypt
from jose import JWTError, jwt
from app.config import settings

if TYPE_CHECKING:
    from app.models.user import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict[str, Any]) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise ValueError("Invalid or expired token") from e


def build_token_claims(user: "User") -> dict[str, Any]:
    """Standard JWT claims for a user. Includes tenant + hierarchy + the
    forced-password-change flag so the frontend can gate access.
    """
    return {
        "sub": str(user.id),
        "company_id": str(user.org_id),
        "org_id": str(user.org_id),
        "role": user.role.value,
        "manager_id": str(user.manager_id) if user.manager_id else None,
        "must_change_password": user.must_change_password,
    }


class PasswordComplexityError(ValueError):
    """Raised when a password fails complexity requirements."""


def validate_password_complexity(password: str) -> str:
    """Enforce: >= 8 chars, with lower, upper and a digit. Returns the password."""
    if len(password) < 8:
        raise PasswordComplexityError("Password must be at least 8 characters")
    if not re.search(r"[a-z]", password):
        raise PasswordComplexityError("Password must contain a lowercase letter")
    if not re.search(r"[A-Z]", password):
        raise PasswordComplexityError("Password must contain an uppercase letter")
    if not re.search(r"\d", password):
        raise PasswordComplexityError("Password must contain a digit")
    return password
