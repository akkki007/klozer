import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UUID, Enum, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ActivityType(str, enum.Enum):
    call_in = "call_in"
    call_out = "call_out"
    visit = "visit"
    note = "note"
    whatsapp = "whatsapp"
    email = "email"
    status_change = "status_change"


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type: Mapped[ActivityType] = mapped_column(Enum(ActivityType), nullable=False)
    outcome: Mapped[str | None] = mapped_column(String(100), nullable=True)  # interested / callback / not_interested / etc.
    duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)  # note text / message body
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # WhatsApp message id, etc.
    meta_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="activities")
