import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UUID, Enum, Boolean, Text, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class NotificationType(str, enum.Enum):
    account_created = "account_created"
    temp_password = "temp_password"
    password_reset = "password_reset"
    manager_changed = "manager_changed"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class EmployeeCodeCounter(Base):
    """Per-company, per-year serial allocator for employee codes.

    Rows are locked with SELECT ... FOR UPDATE to guarantee unique, gap-free
    serials under concurrent user creation.
    """
    __tablename__ = "employee_code_counters"
    __table_args__ = (
        UniqueConstraint("org_id", "year", name="uq_emp_code_counter_org_year"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    last_serial: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
