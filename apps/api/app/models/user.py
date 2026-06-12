import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, UUID, Enum, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

import enum


class UserRole(str, enum.Enum):
    company_admin = "company_admin"
    head = "head"
    employee = "employee"


class UserStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    invited = "invited"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("org_id", "employee_code", name="uq_users_org_employee_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)

    # Reporting hierarchy: Admin -> Head -> Employee. NULL manager = top of company.
    manager_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)  # full name
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)  # mobile
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fb_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)

    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.employee)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.active)

    # Employment / profile details
    designation: Mapped[str | None] = mapped_column(String(150), nullable=True)
    department: Mapped[str | None] = mapped_column(String(150), nullable=True)
    employee_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    joining_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Forces a password change on next login when a temporary password was issued.
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="users")
    push_tokens: Mapped[list["PushToken"]] = relationship("PushToken", back_populates="user")

    # Self-referential hierarchy
    manager: Mapped["User | None"] = relationship(
        "User", remote_side=[id], foreign_keys=[manager_id], back_populates="reports"
    )
    reports: Mapped[list["User"]] = relationship(
        "User", foreign_keys=[manager_id], back_populates="manager"
    )


class PushToken(Base):
    __tablename__ = "push_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(20))  # android / ios / web
    token: Mapped[str] = mapped_column(String(512), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="push_tokens")
