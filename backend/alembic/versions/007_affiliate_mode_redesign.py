"""affiliate mode redesign: off/public/private

Revision ID: 007
Revises: 006
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"


def upgrade() -> None:
    # Create the affiliatemode enum
    affiliate_mode_enum = sa.Enum("off", "public", "private", name="affiliatemode")
    affiliate_mode_enum.create(op.get_bind())

    # Add affiliate_mode column with default 'off'
    op.add_column(
        "events",
        sa.Column("affiliate_mode", affiliate_mode_enum, server_default="off", nullable=False),
    )

    # Migrate existing data: affiliate_enabled=true -> 'public'
    op.execute("UPDATE events SET affiliate_mode = 'public' WHERE affiliate_enabled = true")

    # Drop affiliate_enabled column
    op.drop_column("events", "affiliate_enabled")

    # Add new columns to promoters
    op.add_column("promoters", sa.Column("personal_promo_code", sa.String(50), nullable=True, unique=True))
    op.add_column("promoters", sa.Column("promo_code_discount_percent", sa.Numeric(5, 2), nullable=True))
    op.add_column("promoters", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("promoters", sa.Column("invited_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))

    # Make user_id nullable (invited promoters may not have accounts yet)
    op.alter_column("promoters", "user_id", existing_type=sa.Integer(), nullable=True)

    # Drop the unique constraint on (user_id, event_id) and recreate allowing nulls
    op.drop_constraint("uq_promoter_user_event", "promoters", type_="unique")

    # Create indexes
    op.create_index("ix_promoters_personal_promo_code", "promoters", ["personal_promo_code"])
    op.create_index("ix_promoters_email", "promoters", ["email"])


def downgrade() -> None:
    op.drop_index("ix_promoters_email", "promoters")
    op.drop_index("ix_promoters_personal_promo_code", "promoters")

    op.create_unique_constraint("uq_promoter_user_event", "promoters", ["user_id", "event_id"])

    op.alter_column("promoters", "user_id", existing_type=sa.Integer(), nullable=False)

    op.drop_column("promoters", "invited_by")
    op.drop_column("promoters", "email")
    op.drop_column("promoters", "promo_code_discount_percent")
    op.drop_column("promoters", "personal_promo_code")

    # Add back affiliate_enabled
    op.add_column("events", sa.Column("affiliate_enabled", sa.Boolean(), server_default="false", nullable=False))
    op.execute("UPDATE events SET affiliate_enabled = true WHERE affiliate_mode = 'public'")

    op.drop_column("events", "affiliate_mode")
    sa.Enum(name="affiliatemode").drop(op.get_bind())
