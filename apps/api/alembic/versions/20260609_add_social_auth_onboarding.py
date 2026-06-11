"""add social auth and onboarding fields

Revision ID: a1b2c3d4e5f6
Revises: e0d5c1d55d9b
Create Date: 2026-06-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e0d5c1d55d9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('fb_id', sa.String(64), nullable=True))
    op.create_unique_constraint('uq_users_fb_id', 'users', ['fb_id'])

    op.add_column('organizations', sa.Column('business_type', sa.String(100), nullable=True))
    op.add_column('organizations', sa.Column('website', sa.String(255), nullable=True))
    op.add_column('organizations', sa.Column('team_size', sa.String(50), nullable=True))
    op.add_column('organizations', sa.Column('lead_source_pref', sa.String(255), nullable=True))
    op.add_column('organizations', sa.Column('onboarding_done', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_constraint('uq_users_fb_id', 'users', type_='unique')
    op.drop_column('users', 'fb_id')

    op.drop_column('organizations', 'onboarding_done')
    op.drop_column('organizations', 'lead_source_pref')
    op.drop_column('organizations', 'team_size')
    op.drop_column('organizations', 'website')
    op.drop_column('organizations', 'business_type')
