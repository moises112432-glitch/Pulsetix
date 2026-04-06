import uuid

import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.event import Event
from app.models.promo import PromoCode
from app.models.promoter import Promoter
from app.models.ticket import Order, OrderStatus, Ticket, TicketType
from app.models.user import User
from app.schemas.order import CheckoutRequest, CheckoutResponse, OrderResponse, TicketResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Event).where(Event.id == body.event_id).options(selectinload(Event.ticket_types))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Validate promo code if provided
    discount_percent = 0.0
    promo: PromoCode | None = None
    promoter_from_promo: Promoter | None = None
    if body.promo_code:
        code = body.promo_code.strip().upper()
        # First check regular promo codes
        promo_result = await db.execute(
            select(PromoCode).where(
                PromoCode.event_id == event.id,
                PromoCode.code == code,
            )
        )
        promo = promo_result.scalar_one_or_none()
        if promo:
            if not promo.active:
                raise HTTPException(status_code=400, detail="Invalid or inactive promo code")
            if promo.max_uses and promo.times_used >= promo.max_uses:
                raise HTTPException(status_code=400, detail="This promo code has been fully redeemed")
            discount_percent = float(promo.discount_percent)
        else:
            # Check promoter personal promo codes
            promoter_promo_result = await db.execute(
                select(Promoter).where(
                    Promoter.personal_promo_code == code,
                    Promoter.event_id == event.id,
                )
            )
            promoter_from_promo = promoter_promo_result.scalar_one_or_none()
            if promoter_from_promo:
                if promoter_from_promo.promo_code_discount_percent:
                    discount_percent = float(promoter_from_promo.promo_code_discount_percent)
            else:
                raise HTTPException(status_code=400, detail="Invalid promo code")

    # Resolve referral code if provided
    promoter: Promoter | None = None
    if promoter_from_promo:
        # Promoter personal promo code also attributes the sale
        promoter = promoter_from_promo
        if promoter.user_id == current_user.id:
            promoter = None
    elif body.ref:
        ref_result = await db.execute(
            select(Promoter).where(Promoter.referral_code == body.ref, Promoter.event_id == event.id)
        )
        promoter = ref_result.scalar_one_or_none()
        # Prevent self-referral
        if promoter and promoter.user_id == current_user.id:
            promoter = None

    line_items = []
    total = 0.0
    ticket_plan: list[tuple[TicketType, int]] = []

    for item in body.items:
        tt = next((t for t in event.ticket_types if t.id == item.ticket_type_id), None)
        if not tt:
            raise HTTPException(status_code=400, detail=f"Ticket type {item.ticket_type_id} not found")
        available = tt.quantity_total - tt.quantity_sold
        if item.quantity > available:
            raise HTTPException(status_code=400, detail=f"Only {available} tickets available for {tt.name}")

        unit_price = float(tt.price)
        if discount_percent > 0:
            unit_price = round(unit_price * (1 - discount_percent / 100), 2)

        line_items.append({
            "price_data": {
                "currency": "usd",
                "product_data": {"name": f"{event.title} — {tt.name}"},
                "unit_amount": int(unit_price * 100),
            },
            "quantity": item.quantity,
        })
        total += unit_price * item.quantity
        ticket_plan.append((tt, item.quantity))

    # Create order record
    order = Order(
        user_id=current_user.id,
        event_id=event.id,
        total=total,
        status=OrderStatus.pending,
        promoter_id=promoter.id if promoter else None,
    )
    db.add(order)
    await db.flush()

    # Create ticket records (QR codes assigned after payment in webhook)
    for tt, qty in ticket_plan:
        for _ in range(qty):
            db.add(Ticket(
                order_id=order.id,
                ticket_type_id=tt.id,
            ))

    # Look up the organizer to check for Stripe Connect
    organizer = await db.get(User, event.organizer_id)

    # Add service fee as a separate line item (buyer pays)
    ticket_total_cents = sum(item["price_data"]["unit_amount"] * item["quantity"] for item in line_items)
    fee_cents = int(ticket_total_cents * settings.APPLICATION_FEE_PERCENT / 100)

    if fee_cents > 0:
        line_items.append({
            "price_data": {
                "currency": "usd",
                "product_data": {"name": "Service Fee"},
                "unit_amount": fee_cents,
            },
            "quantity": 1,
        })

    session_params: dict = {
        "payment_method_types": ["card"],
        "line_items": line_items,
        "mode": "payment",
        "success_url": f"{settings.FRONTEND_URL}/checkout?success=true&order_id={order.id}",
        "cancel_url": f"{settings.FRONTEND_URL}/events/{event.id}",
        "metadata": {"order_id": str(order.id)},
    }

    # Route payment to organizer's connected Stripe account
    if organizer and organizer.stripe_account_id and organizer.stripe_onboarding_complete:
        session_params["payment_intent_data"] = {
            "application_fee_amount": fee_cents,
            "transfer_data": {"destination": organizer.stripe_account_id},
        }

    session = stripe.checkout.Session.create(**session_params)

    order.stripe_checkout_session_id = session.id

    # Increment promo code usage
    if promo:
        promo.times_used += 1

    await db.commit()

    return CheckoutResponse(checkout_url=session.url, order_id=order.id)


@router.get("/", response_model=list[OrderResponse])
async def list_my_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(
            selectinload(Order.tickets).selectinload(Ticket.ticket_type),
            selectinload(Order.event),
        )
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return [_serialize_order(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.tickets).selectinload(Ticket.ticket_type))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return _serialize_order(order)


@router.post("/{order_id}/refund")
async def refund_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Refund an order. Allowed by the buyer or the event organizer."""
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.tickets).selectinload(Ticket.ticket_type),
            selectinload(Order.event),
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Allow buyer or organizer to refund
    is_buyer = order.user_id == current_user.id
    is_organizer = order.event.organizer_id == current_user.id
    if not is_buyer and not is_organizer:
        raise HTTPException(status_code=403, detail="Not authorized")

    if order.status != OrderStatus.completed:
        raise HTTPException(status_code=400, detail="Only completed orders can be refunded")

    # Check if any tickets are already checked in
    checked_in = [t for t in order.tickets if t.checked_in_at is not None]
    if checked_in:
        raise HTTPException(status_code=400, detail="Cannot refund — some tickets have already been checked in")

    # Process Stripe refund
    if order.stripe_checkout_session_id:
        try:
            session = stripe.checkout.Session.retrieve(order.stripe_checkout_session_id)
            if session.payment_intent:
                stripe.Refund.create(payment_intent=session.payment_intent)
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Stripe refund failed: {str(e)}")

    # Update order status
    order.status = OrderStatus.refunded

    # Restore ticket quantities and invalidate tickets
    for ticket in order.tickets:
        ticket.qr_code_token = None
        ticket.checked_in_at = None
        tt_result = await db.execute(
            select(TicketType).where(TicketType.id == ticket.ticket_type_id)
        )
        tt = tt_result.scalar_one()
        if tt.quantity_sold > 0:
            tt.quantity_sold -= 1

    await db.commit()

    # Send refund confirmation email
    try:
        buyer = await db.get(User, order.user_id)
        if buyer:
            from app.services.email import send_refund_confirmation
            await send_refund_confirmation(
                to_email=buyer.email,
                user_name=buyer.name,
                event_title=order.event.title,
                refund_amount=float(order.total),
            )
    except Exception:
        pass

    return {"detail": "Order refunded successfully", "order_id": order.id}


def _serialize_order(order: Order) -> dict:
    data = {
        "id": order.id,
        "event_id": order.event_id,
        "total": float(order.total),
        "status": order.status.value,
        "created_at": order.created_at,
        "tickets": [
            TicketResponse(
                id=t.id,
                ticket_type_name=t.ticket_type.name,
                qr_code_token=t.qr_code_token,
                checked_in_at=t.checked_in_at,
            )
            for t in order.tickets
        ],
    }
    # Include event info if loaded
    if hasattr(order, "event") and order.event:
        data["event_title"] = order.event.title
        data["event_location"] = order.event.location
        data["event_start_time"] = order.event.start_time.isoformat()
        data["event_end_time"] = order.event.end_time.isoformat()
        data["event_cover_image"] = order.event.cover_image
        data["event_organizer_id"] = order.event.organizer_id
    return data
