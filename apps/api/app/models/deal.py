import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UUID, Enum, Numeric, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DealStatus(str, enum.Enum):
    open = "open"
    won = "won"
    lost = "lost"


class DealStage(Base):
    __tablename__ = "deal_stages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_won: Mapped[bool] = mapped_column(default=False)
    is_lost: Mapped[bool] = mapped_column(default=False)

    deals: Mapped[list["Deal"]] = relationship("Deal", back_populates="stage")


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False, unique=True)
    stage_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("deal_stages.id"), nullable=False)
    value: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    status: Mapped[DealStatus] = mapped_column(Enum(DealStatus), default=DealStatus.open)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="deal")
    stage: Mapped["DealStage"] = relationship("DealStage", back_populates="deals")
