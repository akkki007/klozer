import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UUID, Enum, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ChannelType(str, enum.Enum):
    whatsapp = "whatsapp"
    email = "email"


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    channel: Mapped[ChannelType] = mapped_column(Enum(ChannelType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # For WhatsApp: this is the approved template name on Meta; body is the display preview
    whatsapp_template_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    variables_json: Mapped[list | None] = mapped_column(JSON, nullable=True)  # ["{{name}}", "{{phone}}"]
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FileAsset(Base):
    __tablename__ = "file_assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50))  # pdf / image / video
    tracking_token: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
