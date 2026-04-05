"""make qr_code_token nullable for pending tickets

Revision ID: 009
Revises: 008
"""

from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"


def upgrade() -> None:
    op.alter_column("tickets", "qr_code_token", existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    # Backfill any nulls before making non-nullable
    op.execute("UPDATE tickets SET qr_code_token = gen_random_uuid()::text WHERE qr_code_token IS NULL")
    op.alter_column("tickets", "qr_code_token", existing_type=sa.String(255), nullable=False)
