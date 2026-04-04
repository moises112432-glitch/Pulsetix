import enum
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, String, Enum, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    attendee = "attendee"
    organizer = "organizer"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.attendee)
    avatar: Mapped[str | None] = mapped_column(String(512))
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    stripe_account_id: Mapped[str | None] = mapped_column(String(255))
    stripe_onboarding_complete: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    events: Mapped[list["Event"]] = relationship(back_populates="organizer")
    orders: Mapped[list["Order"]] = relationship(back_populates="user")

    followers: Mapped[list["Follow"]] = relationship(
        foreign_keys="Follow.following_id", back_populates="following"
    )
    following: Mapped[list["Follow"]] = relationship(
        foreign_keys="Follow.follower_id", back_populates="follower"
    )


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    follower_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    following_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    follower: Mapped["User"] = relationship(foreign_keys=[follower_id], back_populates="following")
    following: Mapped["User"] = relationship(foreign_keys=[following_id], back_populates="followers")


# Avoid circular import issues — these are used for type hints above
from app.models.event import Event  # noqa: E402
from app.models.ticket import Order  # noqa: E402
