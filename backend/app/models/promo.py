from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Numeric, Integer, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50), index=True)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2))  # e.g. 25.00 = 25% off
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)  # null = unlimited
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    event: Mapped["Event"] = relationship(back_populates="promo_codes")


from app.models.event import Event  # noqa: E402
