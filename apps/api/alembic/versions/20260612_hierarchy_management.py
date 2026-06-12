"""hierarchy management: roles, user profile fields, audit, notifications

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Rename role enum values: admin->company_admin, manager->head, rep->employee
    op.execute("ALTER TYPE userrole RENAME VALUE 'admin' TO 'company_admin'")
    op.execute("ALTER TYPE userrole RENAME VALUE 'manager' TO 'head'")
    op.execute("ALTER TYPE userrole RENAME VALUE 'rep' TO 'employee'")

    # ── 2. Organizations: company_code
    op.add_column('organizations', sa.Column('company_code', sa.String(length=32), nullable=True))
    op.create_unique_constraint('uq_organizations_company_code', 'organizations', ['company_code'])

    # ── 3. Users: hierarchy + employment profile + password rotation flag
    op.add_column('users', sa.Column('manager_id', sa.UUID(), nullable=True))
    op.add_column('users', sa.Column('created_by', sa.UUID(), nullable=True))
    op.add_column('users', sa.Column('designation', sa.String(length=150), nullable=True))
    op.add_column('users', sa.Column('department', sa.String(length=150), nullable=True))
    op.add_column('users', sa.Column('employee_code', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('joining_date', sa.Date(), nullable=True))
    op.add_column('users', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default='false'))
    op.create_foreign_key('fk_users_manager_id', 'users', 'users', ['manager_id'], ['id'])
    op.create_foreign_key('fk_users_created_by', 'users', 'users', ['created_by'], ['id'])
    op.create_unique_constraint('uq_users_org_employee_code', 'users', ['org_id', 'employee_code'])

    # ── 4. Employee code counters (atomic per-company per-year serial)
    op.create_table(
        'employee_code_counters',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('last_serial', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'year', name='uq_emp_code_counter_org_year'),
    )

    # ── 5. Audit logs
    # create_type defaults to True, so create_table emits CREATE TYPE for us.
    auditaction = sa.Enum(
        'user_created', 'user_updated', 'password_reset', 'password_changed',
        'role_changed', 'manager_changed', 'user_deactivated', 'user_activated', 'login',
        name='auditaction',
    )
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('actor_user_id', sa.UUID(), nullable=True),
        sa.Column('target_user_id', sa.UUID(), nullable=True),
        sa.Column('action', auditaction, nullable=False),
        sa.Column('detail_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_logs_org_id'), 'audit_logs', ['org_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)

    # ── 6. Notifications
    notificationtype = sa.Enum(
        'account_created', 'temp_password', 'password_reset', 'manager_changed',
        name='notificationtype',
    )
    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('type', notificationtype, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notifications_org_id'), 'notifications', ['org_id'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_created_at'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_org_id'), table_name='notifications')
    op.drop_table('notifications')
    op.execute('DROP TYPE IF EXISTS notificationtype')

    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_org_id'), table_name='audit_logs')
    op.drop_table('audit_logs')
    op.execute('DROP TYPE IF EXISTS auditaction')

    op.drop_table('employee_code_counters')

    op.drop_constraint('uq_users_org_employee_code', 'users', type_='unique')
    op.drop_constraint('fk_users_created_by', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_manager_id', 'users', type_='foreignkey')
    for col in ('must_change_password', 'notes', 'joining_date', 'address',
                'employee_code', 'department', 'designation', 'created_by', 'manager_id'):
        op.drop_column('users', col)

    op.drop_constraint('uq_organizations_company_code', 'organizations', type_='unique')
    op.drop_column('organizations', 'company_code')

    op.execute("ALTER TYPE userrole RENAME VALUE 'employee' TO 'rep'")
    op.execute("ALTER TYPE userrole RENAME VALUE 'head' TO 'manager'")
    op.execute("ALTER TYPE userrole RENAME VALUE 'company_admin' TO 'admin'")
