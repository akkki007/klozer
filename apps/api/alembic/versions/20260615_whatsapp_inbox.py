"""WhatsApp inbox: nullable activity.user_id (inbound msgs) + leads.wa_last_read_at

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Inbound WhatsApp messages have no LeadMax user, so user_id must be nullable.
    op.alter_column("activities", "user_id", existing_type=sa.UUID(), nullable=True)
    # Per-conversation read marker for the WhatsApp inbox.
    op.add_column("leads", sa.Column("wa_last_read_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("leads", "wa_last_read_at")
    op.alter_column("activities", "user_id", existing_type=sa.UUID(), nullable=False)
