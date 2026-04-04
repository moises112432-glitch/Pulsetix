"""add stripe connect fields to users

Revision ID: 004
Revises: 003
Create Date: 2026-04-03
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_account_id", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("stripe_onboarding_complete", sa.Boolean(), server_default="false", nullable=False))


def downgrade() -> None:
    op.drop_column("users", "stripe_onboarding_complete")
    op.drop_column("users", "stripe_account_id")
