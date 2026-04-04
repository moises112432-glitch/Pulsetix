import io
from datetime import datetime, timezone

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.event import Event
from app.models.ticket import Order, OrderStatus, Ticket, TicketType
from app.models.user import User
from app.schemas.event import TicketTypeCreate, TicketTypeResponse

router = APIRouter(prefix="/api", tags=["tickets"])


@router.post("/events/{event_id}/ticket-types", response_model=TicketTypeResponse, status_code=201)
async def add_ticket_type(
    event_id: int,
    body: TicketTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    tt = TicketType(
        event_id=event_id,
        name=body.name,
        price=body.price,
        quantity_total=body.quantity_total,
    )
    db.add(tt)
    await db.commit()
    await db.refresh(tt)
    return tt


@router.post("/tickets/{qr_token}/checkin")
async def check_in_ticket(
    qr_token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Ticket)
        .where(Ticket.qr_code_token == qr_token)
        .options(
            selectinload(Ticket.ticket_type),
            selectinload(Ticket.order).selectinload(Order.event),
            selectinload(Ticket.order).selectinload(Order.user),
        )
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Verify the scanner is the event organizer
    if ticket.order.event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the organizer of this event")

    # Check if order was actually paid
    if ticket.order.status != OrderStatus.completed:
        raise HTTPException(status_code=400, detail="This ticket's order was not completed")

    if ticket.checked_in_at:
        raise HTTPException(
            status_code=400,
            detail="Already checked in",
            headers={"X-Checked-In-At": ticket.checked_in_at.isoformat()},
        )

    ticket.checked_in_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "status": "success",
        "ticket_id": ticket.id,
        "attendee_name": ticket.order.user.name,
        "attendee_email": ticket.order.user.email,
        "ticket_type": ticket.ticket_type.name,
        "event_title": ticket.order.event.title,
        "checked_in_at": ticket.checked_in_at.isoformat(),
    }


@router.get("/tickets/{qr_token}/verify")
async def verify_ticket(
    qr_token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check ticket status without checking in."""
    result = await db.execute(
        select(Ticket)
        .where(Ticket.qr_code_token == qr_token)
        .options(
            selectinload(Ticket.ticket_type),
            selectinload(Ticket.order).selectinload(Order.event),
            selectinload(Ticket.order).selectinload(Order.user),
        )
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {
        "ticket_id": ticket.id,
        "attendee_name": ticket.order.user.name,
        "ticket_type": ticket.ticket_type.name,
        "event_title": ticket.order.event.title,
        "order_status": ticket.order.status.value,
        "checked_in": ticket.checked_in_at is not None,
        "checked_in_at": ticket.checked_in_at.isoformat() if ticket.checked_in_at else None,
    }


@router.get("/tickets/{qr_token}/detail")
async def get_ticket_detail(
    qr_token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Ticket)
        .where(Ticket.qr_code_token == qr_token)
        .options(
            selectinload(Ticket.ticket_type),
            selectinload(Ticket.order).selectinload(Order.event),
            selectinload(Ticket.order).selectinload(Order.user),
        )
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {
        "ticket_id": ticket.id,
        "qr_code_token": ticket.qr_code_token,
        "ticket_type": ticket.ticket_type.name,
        "event_title": ticket.order.event.title,
        "event_location": ticket.order.event.location,
        "event_start": ticket.order.event.start_time.isoformat(),
        "event_end": ticket.order.event.end_time.isoformat(),
        "attendee_name": ticket.order.user.name,
        "checked_in": ticket.checked_in_at is not None,
    }


@router.get("/tickets/{qr_token}/public")
async def get_ticket_public(
    qr_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public ticket view — no login required. Anyone with the link can see the ticket."""
    result = await db.execute(
        select(Ticket)
        .where(Ticket.qr_code_token == qr_token)
        .options(
            selectinload(Ticket.ticket_type),
            selectinload(Ticket.order).selectinload(Order.event),
            selectinload(Ticket.order).selectinload(Order.user),
        )
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {
        "ticket_id": ticket.id,
        "qr_code_token": ticket.qr_code_token,
        "ticket_type": ticket.ticket_type.name,
        "event_title": ticket.order.event.title,
        "event_location": ticket.order.event.location,
        "event_start": ticket.order.event.start_time.isoformat(),
        "event_end": ticket.order.event.end_time.isoformat(),
        "attendee_name": ticket.order.user.name,
        "checked_in": ticket.checked_in_at is not None,
    }


@router.get("/tickets/{qr_token}/qr.png")
async def get_qr_image(qr_token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Ticket).where(Ticket.qr_code_token == qr_token)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Encode a URL so phone cameras open the ticket page directly
    from app.core.config import settings
    ticket_url = f"{settings.FRONTEND_URL}/ticket/{qr_token}"

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(ticket_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return StreamingResponse(buffer, media_type="image/png")
