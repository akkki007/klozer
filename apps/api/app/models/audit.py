import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UUID, Enum, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AuditAction(str, enum.Enum):
    user_created = "user_created"
    user_updated = "user_updated"
    password_reset = "password_reset"
    password_changed = "password_changed"
    role_changed = "role_changed"
    manager_changed = "manager_changed"
    user_deactivated = "user_deactivated"
    user_activated = "user_activated"
    login = "login"


class AuditLog(Base):
    """Immutable trail of user-management actions, scoped per company (org)."""
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction), nullable=False)
    detail_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
