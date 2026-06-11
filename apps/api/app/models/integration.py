import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UUID, Enum, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class IntegrationProvider(str, enum.Enum):
    facebook = "facebook"
    instagram = "instagram"
    linkedin = "linkedin"
    whatsapp = "whatsapp"


class IntegrationStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    expired = "expired"
    revoked = "revoked"


class IntegrationCredential(Base):
    """
    OAuth tokens stored AES-Fernet encrypted at rest.
    Never log raw access_token_enc or refresh_token_enc values.
    """
    __tablename__ = "integration_credentials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    provider: Mapped[IntegrationProvider] = mapped_column(Enum(IntegrationProvider), nullable=False)
    access_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    scopes: Mapped[str | None] = mapped_column(Text, nullable=True)  # space-separated
    external_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # page_id / WABA id / etc.
    external_account_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[IntegrationStatus] = mapped_column(Enum(IntegrationStatus), default=IntegrationStatus.pending)
    meta_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # e.g. phone_number_id for WhatsApp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
