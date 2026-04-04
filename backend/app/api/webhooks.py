import stripe
from fastapi import APIRouter, Header, HTTPException, Request, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.ticket import Order, OrderStatus, Ticket, TicketType
from app.services.email import send_order_confirmation

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        order_id = int(session["metadata"]["order_id"])

        result = await db.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(
                selectinload(Order.tickets).selectinload(Ticket.ticket_type),
                selectinload(Order.user),
                selectinload(Order.event),
            )
        )
        order = result.scalar_one_or_none()
        if not order:
            return {"status": "order not found"}

        order.status = OrderStatus.completed

        # Update sold quantities
        for ticket in order.tickets:
            tt_result = await db.execute(
                select(TicketType).where(TicketType.id == ticket.ticket_type_id)
            )
            tt = tt_result.scalar_one()
            tt.quantity_sold += 1

        await db.commit()

        # Send confirmation email
        try:
            await send_order_confirmation(
                to_email=order.user.email,
                user_name=order.user.name,
                event_title=order.event.title,
                tickets=order.tickets,
            )
        except Exception as e:
            print(f"Email send failed: {e}")

    return {"status": "ok"}
