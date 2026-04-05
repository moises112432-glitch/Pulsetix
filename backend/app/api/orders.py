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
    if body.promo_code:
        code = body.promo_code.strip().upper()
        promo_result = await db.execute(
            select(PromoCode).where(
                PromoCode.event_id == event.id,
                PromoCode.code == code,
            )
        )
        promo = promo_result.scalar_one_or_none()
        if not promo or not promo.active:
            raise HTTPException(status_code=400, detail="Invalid or inactive promo code")
        if promo.max_uses and promo.times_used >= promo.max_uses:
            raise HTTPException(status_code=400, detail="This promo code has been fully redeemed")
        discount_percent = float(promo.discount_percent)

    # Resolve referral code if provided
    promoter: Promoter | None = None
    if body.ref:
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

    # Create ticket records
    for tt, qty in ticket_plan:
        for _ in range(qty):
            db.add(Ticket(
                order_id=order.id,
                ticket_type_id=tt.id,
                qr_code_token=uuid.uuid4().hex,
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
        .options(selectinload(Order.tickets).selectinload(Ticket.ticket_type))
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


def _serialize_order(order: Order) -> dict:
    return {
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
