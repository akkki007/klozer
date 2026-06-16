import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UUID, Enum, JSON, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class LeadSourceType(str, enum.Enum):
    manual = "manual"
    csv = "csv"
    webhook = "webhook"
    gsheet = "gsheet"
    facebook = "facebook"
    instagram = "instagram"
    linkedin = "linkedin"
    whatsapp = "whatsapp"


class LeadSourceStatus(str, enum.Enum):
    connected = "connected"
    scaffolded = "scaffolded"
    error = "error"


class LeadCategory(str, enum.Enum):
    fresh = "fresh"
    needs_followup = "needs_followup"
    uncontacted = "uncontacted"
    did_not_pick = "did_not_pick"
    outcome_unknown = "outcome_unknown"


class DistributionStrategy(str, enum.Enum):
    round_robin = "round_robin"
    by_source = "by_source"
    by_team = "by_team"
    by_load = "by_load"


class LeadSource(Base):
    __tablename__ = "lead_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    type: Mapped[LeadSourceType] = mapped_column(Enum(LeadSourceType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[LeadSourceStatus] = mapped_column(Enum(LeadSourceStatus), default=LeadSourceStatus.scaffolded)
    config_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="lead_sources")
    leads: Mapped[list["Lead"]] = relationship("Lead", back_populates="source")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("lead_sources.id"), nullable=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    stage_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("deal_stages.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), default="open")
    category: Mapped[LeadCategory] = mapped_column(Enum(LeadCategory), default=LeadCategory.fresh)
    raw_payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_engaged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # WhatsApp inbox read marker — inbound messages newer than this count as unread.
    wa_last_read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    source: Mapped["LeadSource | None"] = relationship("LeadSource", back_populates="leads")
    activities: Mapped[list["Activity"]] = relationship("Activity", back_populates="lead", order_by="Activity.created_at.desc()")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="lead")
    deal: Mapped["Deal | None"] = relationship("Deal", back_populates="lead", uselist=False)


class WebhookEvent(Base):
    """Idempotency table — de-duplicates webhook replays."""
    __tablename__ = "webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    external_id: Mapped[str] = mapped_column(String(512), nullable=False, index=True, unique=True)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending | processed | failed
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DistributionRule(Base):
    __tablename__ = "distribution_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    strategy: Mapped[DistributionStrategy] = mapped_column(Enum(DistributionStrategy), default=DistributionStrategy.round_robin)
    config_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
