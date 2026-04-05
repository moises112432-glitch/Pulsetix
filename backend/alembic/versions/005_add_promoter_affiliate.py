"""add promoter affiliate system

Revision ID: 005
Revises: 004
"""

from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"


def upgrade() -> None:
    # Add affiliate fields to events
    op.add_column("events", sa.Column("affiliate_enabled", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("events", sa.Column("affiliate_commission_percent", sa.Numeric(5, 2), nullable=True))

    # Create promoters table
    op.create_table(
        "promoters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("referral_code", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "event_id", name="uq_promoter_user_event"),
    )

    # Create commissions table
    commission_status = sa.Enum("pending", "approved", "paid", name="commissionstatus")
    op.create_table(
        "commissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("promoter_id", sa.Integer(), sa.ForeignKey("promoters.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", commission_status, nullable=False, server_default="pending"),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Add promoter_id to orders
    op.add_column("orders", sa.Column("promoter_id", sa.Integer(), sa.ForeignKey("promoters.id"), nullable=True, index=True))


def downgrade() -> None:
    op.drop_column("orders", "promoter_id")
    op.drop_table("commissions")
    op.drop_table("promoters")
    sa.Enum(name="commissionstatus").drop(op.get_bind())
    op.drop_column("events", "affiliate_commission_percent")
    op.drop_column("events", "affiliate_enabled")
