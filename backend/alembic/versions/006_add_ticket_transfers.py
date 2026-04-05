"""add ticket transfers

Revision ID: 006
Revises: 005
"""

from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"


def upgrade() -> None:
    # Add current_holder_id to tickets
    op.add_column("tickets", sa.Column("current_holder_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))

    # Create transfer status enum
    transfer_status = sa.Enum("pending", "claimed", "cancelled", name="transferstatus")

    # Create ticket_transfers table
    op.create_table(
        "ticket_transfers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient_email", sa.String(255), nullable=False),
        sa.Column("recipient_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("claim_token", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("status", transfer_status, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("ticket_transfers")
    sa.Enum(name="transferstatus").drop(op.get_bind())
    op.drop_column("tickets", "current_holder_id")
