"""Add tier_order to ticket_types

Revision ID: 002
Revises: 001
Create Date: 2026-04-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ticket_types", sa.Column("tier_order", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("ticket_types", "tier_order")
