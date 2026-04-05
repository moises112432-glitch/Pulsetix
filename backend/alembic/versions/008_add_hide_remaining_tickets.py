"""add hide_remaining_tickets to events

Revision ID: 008
Revises: 007
"""

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"


def upgrade() -> None:
    op.add_column("events", sa.Column("hide_remaining_tickets", sa.Boolean(), server_default="false", nullable=False))


def downgrade() -> None:
    op.drop_column("events", "hide_remaining_tickets")
