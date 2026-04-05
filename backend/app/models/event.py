import enum
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Text, Enum, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EventStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    cancelled = "cancelled"


class AffiliateMode(str, enum.Enum):
    off = "off"
    public = "public"
    private = "private"


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    organizer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(500))
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cover_image: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[EventStatus] = mapped_column(Enum(EventStatus), default=EventStatus.draft)
    affiliate_mode: Mapped[AffiliateMode] = mapped_column(Enum(AffiliateMode), default=AffiliateMode.off)
    affiliate_commission_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    organizer: Mapped["User"] = relationship(back_populates="events")
    ticket_types: Mapped[list["TicketType"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    orders: Mapped[list["Order"]] = relationship(back_populates="event")
    promo_codes: Mapped[list["PromoCode"]] = relationship(back_populates="event", cascade="all, delete-orphan")


from app.models.user import User  # noqa: E402
from app.models.ticket import TicketType, Order  # noqa: E402
from app.models.promo import PromoCode  # noqa: E402
