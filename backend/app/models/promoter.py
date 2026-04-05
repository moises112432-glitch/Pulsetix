import enum
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Numeric, Enum, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CommissionStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    paid = "paid"


class Promoter(Base):
    __tablename__ = "promoters"
    __table_args__ = (UniqueConstraint("user_id", "event_id", name="uq_promoter_user_event"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    referral_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship()
    event: Mapped["Event"] = relationship()
    commissions: Mapped[list["Commission"]] = relationship(back_populates="promoter", cascade="all, delete-orphan")


class Commission(Base):
    __tablename__ = "commissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    promoter_id: Mapped[int] = mapped_column(ForeignKey("promoters.id", ondelete="CASCADE"), index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    status: Mapped[CommissionStatus] = mapped_column(Enum(CommissionStatus), default=CommissionStatus.pending)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    promoter: Mapped["Promoter"] = relationship(back_populates="commissions")


from app.models.user import User  # noqa: E402
from app.models.event import Event  # noqa: E402
