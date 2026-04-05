import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.ticket import Order, OrderStatus, Ticket, TicketTransfer, TransferStatus
from app.models.user import User
from app.schemas.transfer import (
    TransferClaimInfo,
    TransferClaimResponse,
    TransferInitiateRequest,
    TransferInitiateResponse,
    TransferResponse,
)
from app.services.email import send_transfer_email

router = APIRouter(prefix="/api/transfers", tags=["transfers"])


def _get_ticket_owner_id(ticket: Ticket) -> int:
    """Return the current owner of a ticket."""
    return ticket.current_holder_id or ticket.order.user_id


@router.post("/initiate", response_model=TransferInitiateResponse)
async def initiate_transfer(
    body: TransferInitiateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Load ticket with order
    result = await db.execute(
        select(Ticket)
        .where(Ticket.id == body.ticket_id)
        .options(
            selectinload(Ticket.order).selectinload(Order.event),
            selectinload(Ticket.ticket_type),
        )
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Verify ownership
    owner_id = ticket.current_holder_id or ticket.order.user_id
    if owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't own this ticket")

    # Verify order is completed
    if ticket.order.status != OrderStatus.completed:
        raise HTTPException(status_code=400, detail="Ticket order is not completed")

    # Can't transfer checked-in tickets
    if ticket.checked_in_at:
        raise HTTPException(status_code=400, detail="Cannot transfer a checked-in ticket")

    # Can't transfer to yourself
    if body.recipient_email.lower() == current_user.email.lower():
        raise HTTPException(status_code=400, detail="Cannot transfer to yourself")

    # Check for existing pending transfer
    existing = await db.execute(
        select(TicketTransfer).where(
            TicketTransfer.ticket_id == ticket.id,
            TicketTransfer.status == TransferStatus.pending,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This ticket already has a pending transfer")

    # Create transfer
    claim_token = uuid.uuid4().hex
    transfer = TicketTransfer(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        recipient_email=body.recipient_email.lower(),
        claim_token=claim_token,
    )
    db.add(transfer)
    await db.commit()
    await db.refresh(transfer)

    # Send email
    claim_url = f"{settings.FRONTEND_URL}/transfer/claim/{claim_token}"
    try:
        await send_transfer_email(
            to_email=body.recipient_email,
            sender_name=current_user.name,
            event_title=ticket.order.event.title,
            ticket_type=ticket.ticket_type.name,
            claim_url=claim_url,
        )
    except Exception as e:
        print(f"Transfer email failed: {e}")

    return TransferInitiateResponse(
        transfer_id=transfer.id,
        recipient_email=transfer.recipient_email,
        status=transfer.status.value,
        created_at=transfer.created_at,
    )


@router.get("/claim/{claim_token}", response_model=TransferClaimInfo)
async def get_claim_info(
    claim_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — shows transfer details so claim page can render."""
    result = await db.execute(
        select(TicketTransfer)
        .where(TicketTransfer.claim_token == claim_token)
        .options(
            selectinload(TicketTransfer.ticket).selectinload(Ticket.order).selectinload(Order.event),
            selectinload(TicketTransfer.ticket).selectinload(Ticket.ticket_type),
            selectinload(TicketTransfer.sender),
        )
    )
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    return TransferClaimInfo(
        transfer_id=transfer.id,
        event_title=transfer.ticket.order.event.title,
        ticket_type=transfer.ticket.ticket_type.name,
        sender_name=transfer.sender.name,
        status=transfer.status.value,
    )


@router.post("/claim/{claim_token}", response_model=TransferClaimResponse)
async def claim_transfer(
    claim_token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TicketTransfer)
        .where(TicketTransfer.claim_token == claim_token)
        .options(
            selectinload(TicketTransfer.ticket).selectinload(Ticket.order).selectinload(Order.event),
            selectinload(TicketTransfer.ticket).selectinload(Ticket.ticket_type),
        )
    )
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    if transfer.status != TransferStatus.pending:
        raise HTTPException(status_code=400, detail=f"Transfer is already {transfer.status.value}")

    # Can't claim your own transfer
    if transfer.sender_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot claim your own transfer")

    # Transfer the ticket
    ticket = transfer.ticket
    ticket.current_holder_id = current_user.id
    ticket.qr_code_token = uuid.uuid4().hex  # New QR for security

    # Update transfer record
    transfer.status = TransferStatus.claimed
    transfer.recipient_id = current_user.id
    transfer.claimed_at = datetime.now(timezone.utc)

    await db.commit()

    return TransferClaimResponse(
        ticket_id=ticket.id,
        qr_code_token=ticket.qr_code_token,
        event_title=ticket.order.event.title,
        ticket_type=ticket.ticket_type.name,
    )


@router.post("/{transfer_id}/cancel")
async def cancel_transfer(
    transfer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transfer = await db.get(TicketTransfer, transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    if transfer.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if transfer.status != TransferStatus.pending:
        raise HTTPException(status_code=400, detail="Transfer is not pending")

    transfer.status = TransferStatus.cancelled
    transfer.cancelled_at = datetime.now(timezone.utc)
    await db.commit()

    return {"status": "cancelled"}


@router.get("/my", response_model=list[TransferResponse])
async def my_transfers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TicketTransfer)
        .where(
            (TicketTransfer.sender_id == current_user.id)
            | (TicketTransfer.recipient_id == current_user.id)
        )
        .options(
            selectinload(TicketTransfer.ticket).selectinload(Ticket.order).selectinload(Order.event),
            selectinload(TicketTransfer.ticket).selectinload(Ticket.ticket_type),
            selectinload(TicketTransfer.sender),
        )
        .order_by(TicketTransfer.created_at.desc())
    )
    transfers = result.scalars().all()

    return [
        TransferResponse(
            id=t.id,
            ticket_id=t.ticket_id,
            sender_name=t.sender.name,
            recipient_email=t.recipient_email,
            status=t.status.value,
            event_title=t.ticket.order.event.title,
            ticket_type=t.ticket.ticket_type.name,
            created_at=t.created_at,
            claimed_at=t.claimed_at,
            cancelled_at=t.cancelled_at,
        )
        for t in transfers
    ]
