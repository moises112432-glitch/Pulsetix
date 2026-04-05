from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.event import Event
from app.models.ticket import TicketType
from app.models.user import User
from app.models.waitlist import WaitlistEntry

router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])


class WaitlistJoinRequest(BaseModel):
    event_id: int
    email: str
    name: str


class WaitlistJoinResponse(BaseModel):
    id: int
    position: int
    message: str


@router.post("/join", response_model=WaitlistJoinResponse, status_code=201)
async def join_waitlist(
    body: WaitlistJoinRequest,
    db: AsyncSession = Depends(get_db),
):
    """Join the waitlist for a sold-out event. No login required."""
    # Check event exists
    event = await db.get(Event, body.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if event is actually sold out
    result = await db.execute(
        select(
            func.sum(TicketType.quantity_total),
            func.sum(TicketType.quantity_sold),
        ).where(TicketType.event_id == body.event_id)
    )
    row = result.one()
    total_capacity = row[0] or 0
    total_sold = row[1] or 0
    if total_sold < total_capacity:
        raise HTTPException(status_code=400, detail="Tickets are still available — no need for the waitlist!")

    # Check if already on waitlist
    existing = await db.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.email == body.email,
            WaitlistEntry.event_id == body.event_id,
        )
    )
    entry = existing.scalar_one_or_none()
    if entry:
        # Return their existing position
        pos_result = await db.execute(
            select(func.count()).where(
                WaitlistEntry.event_id == body.event_id,
                WaitlistEntry.created_at <= entry.created_at,
            )
        )
        position = pos_result.scalar() or 1
        return WaitlistJoinResponse(
            id=entry.id,
            position=position,
            message="You're already on the waitlist!",
        )

    # Try to link to an existing user
    user_result = await db.execute(
        select(User).where(User.email == body.email)
    )
    user = user_result.scalar_one_or_none()

    new_entry = WaitlistEntry(
        event_id=body.event_id,
        email=body.email,
        name=body.name,
        user_id=user.id if user else None,
    )
    db.add(new_entry)
    await db.commit()
    await db.refresh(new_entry)

    # Get position
    pos_result = await db.execute(
        select(func.count()).where(
            WaitlistEntry.event_id == body.event_id,
            WaitlistEntry.created_at <= new_entry.created_at,
        )
    )
    position = pos_result.scalar() or 1

    return WaitlistJoinResponse(
        id=new_entry.id,
        position=position,
        message="You're on the waitlist! We'll email you when tickets become available.",
    )


@router.get("/events/{event_id}/count")
async def waitlist_count(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Public: get how many people are on the waitlist."""
    result = await db.execute(
        select(func.count()).where(WaitlistEntry.event_id == event_id)
    )
    return {"count": result.scalar() or 0}


@router.get("/events/{event_id}")
async def get_waitlist(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer: get the full waitlist for an event."""
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(WaitlistEntry)
        .where(WaitlistEntry.event_id == event_id)
        .order_by(WaitlistEntry.created_at.asc())
    )
    entries = result.scalars().all()

    return [
        {
            "id": e.id,
            "name": e.name,
            "email": e.email,
            "position": i + 1,
            "joined_at": e.created_at.isoformat(),
            "notified": e.notified_at is not None,
        }
        for i, e in enumerate(entries)
    ]


@router.post("/events/{event_id}/notify")
async def notify_waitlist(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer: send notifications to everyone on the waitlist who hasn't been notified yet."""
    from datetime import datetime, timezone
    from app.services.email import send_waitlist_notification
    from app.core.config import settings

    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.event_id == event_id,
            WaitlistEntry.notified_at.is_(None),
        ).order_by(WaitlistEntry.created_at.asc())
    )
    entries = result.scalars().all()

    if not entries:
        return {"notified": 0, "message": "No one to notify"}

    event_url = f"{settings.FRONTEND_URL}/events/{event_id}"
    notified_count = 0
    for entry in entries:
        try:
            await send_waitlist_notification(
                to_email=entry.email,
                name=entry.name,
                event_title=event.title,
                event_url=event_url,
            )
            entry.notified_at = datetime.now(timezone.utc)
            notified_count += 1
        except Exception:
            pass

    await db.commit()
    return {"notified": notified_count, "message": f"Notified {notified_count} people on the waitlist"}
