import enum
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Numeric, Integer, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class OrderStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class TransferStatus(str, enum.Enum):
    pending = "pending"
    claimed = "claimed"
    cancelled = "cancelled"


class TicketType(Base):
    __tablename__ = "ticket_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    quantity_total: Mapped[int] = mapped_column(Integer)
    quantity_sold: Mapped[int] = mapped_column(Integer, default=0)
    tier_order: Mapped[int] = mapped_column(Integer, default=0)  # 0 = first tier, 1 = second, etc.

    event: Mapped["Event"] = relationship(back_populates="ticket_types")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="ticket_type")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    stripe_checkout_session_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    total: Mapped[float] = mapped_column(Numeric(10, 2))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.pending)
    promoter_id: Mapped[int | None] = mapped_column(ForeignKey("promoters.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="orders")
    event: Mapped["Event"] = relationship(back_populates="orders")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    promoter: Mapped["Promoter | None"] = relationship()


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    ticket_type_id: Mapped[int] = mapped_column(ForeignKey("ticket_types.id", ondelete="CASCADE"))
    qr_code_token: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_holder_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    order: Mapped["Order"] = relationship(back_populates="tickets")
    ticket_type: Mapped["TicketType"] = relationship(back_populates="tickets")
    current_holder: Mapped["User | None"] = relationship(foreign_keys=[current_holder_id])


class TicketTransfer(Base):
    __tablename__ = "ticket_transfers"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    recipient_email: Mapped[str] = mapped_column(String(255))
    recipient_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    claim_token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[TransferStatus] = mapped_column(Enum(TransferStatus), default=TransferStatus.pending)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    ticket: Mapped["Ticket"] = relationship()
    sender: Mapped["User"] = relationship(foreign_keys=[sender_id])


from app.models.event import Event  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.promoter import Promoter  # noqa: E402
