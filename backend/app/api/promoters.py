import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.event import Event
from app.models.promoter import Commission, CommissionStatus, Promoter
from app.models.ticket import Order, OrderStatus
from app.models.user import User
from app.schemas.promoter import (
    CommissionPayoutRequest,
    CommissionResponse,
    PromoterDashboardResponse,
    PromoterResponse,
    PromoterSignupResponse,
)

router = APIRouter(prefix="/api/promoters", tags=["promoters"])


@router.post("/events/{event_id}/signup", response_model=PromoterSignupResponse, status_code=status.HTTP_201_CREATED)
async def signup_as_promoter(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "published":
        raise HTTPException(status_code=400, detail="Event is not published")
    if not event.affiliate_enabled:
        raise HTTPException(status_code=400, detail="Affiliate program not enabled for this event")
    if event.organizer_id == current_user.id:
        raise HTTPException(status_code=400, detail="Organizers cannot promote their own events")

    # Check if already a promoter
    existing = await db.execute(
        select(Promoter).where(Promoter.user_id == current_user.id, Promoter.event_id == event_id)
    )
    existing_promoter = existing.scalar_one_or_none()
    if existing_promoter:
        return PromoterSignupResponse(
            id=existing_promoter.id,
            referral_code=existing_promoter.referral_code,
            referral_url=f"{settings.FRONTEND_URL}/events/{event_id}?ref={existing_promoter.referral_code}",
        )

    referral_code = secrets.token_hex(4)
    promoter = Promoter(
        user_id=current_user.id,
        event_id=event_id,
        referral_code=referral_code,
    )
    db.add(promoter)
    await db.commit()
    await db.refresh(promoter)

    return PromoterSignupResponse(
        id=promoter.id,
        referral_code=promoter.referral_code,
        referral_url=f"{settings.FRONTEND_URL}/events/{event_id}?ref={referral_code}",
    )


@router.get("/events/{event_id}", response_model=list[PromoterResponse])
async def list_event_promoters(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the organizer can view promoters")

    result = await db.execute(
        select(Promoter).where(Promoter.event_id == event_id).options(selectinload(Promoter.user))
    )
    promoters = result.scalars().all()

    responses = []
    for p in promoters:
        # Get stats for this promoter
        stats = await db.execute(
            select(
                func.count(Order.id),
                func.coalesce(func.sum(Order.total), 0),
            ).where(Order.promoter_id == p.id, Order.status == OrderStatus.completed)
        )
        row = stats.one()
        commission_result = await db.execute(
            select(func.coalesce(func.sum(Commission.amount), 0)).where(Commission.promoter_id == p.id)
        )
        total_commission = float(commission_result.scalar())

        responses.append(PromoterResponse(
            id=p.id,
            user_id=p.user_id,
            user_name=p.user.name,
            event_id=p.event_id,
            referral_code=p.referral_code,
            created_at=p.created_at,
            total_sales=int(row[0]),
            total_revenue=float(row[1]),
            total_commission=total_commission,
        ))

    return responses


@router.get("/me", response_model=list[PromoterDashboardResponse])
async def my_promotions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Promoter)
        .where(Promoter.user_id == current_user.id)
        .options(selectinload(Promoter.event))
    )
    promoters = result.scalars().all()

    responses = []
    for p in promoters:
        stats = await db.execute(
            select(
                func.count(Order.id),
                func.coalesce(func.sum(Order.total), 0),
            ).where(Order.promoter_id == p.id, Order.status == OrderStatus.completed)
        )
        row = stats.one()

        commission_result = await db.execute(
            select(func.coalesce(func.sum(Commission.amount), 0)).where(Commission.promoter_id == p.id)
        )
        total_commission = float(commission_result.scalar())

        pending_result = await db.execute(
            select(func.coalesce(func.sum(Commission.amount), 0)).where(
                Commission.promoter_id == p.id, Commission.status == CommissionStatus.pending
            )
        )
        pending_commission = float(pending_result.scalar())

        responses.append(PromoterDashboardResponse(
            event_id=p.event_id,
            event_title=p.event.title,
            referral_code=p.referral_code,
            referral_url=f"{settings.FRONTEND_URL}/events/{p.event_id}?ref={p.referral_code}",
            commission_percent=float(p.event.affiliate_commission_percent or 0),
            total_sales=int(row[0]),
            total_revenue=float(row[1]),
            total_commission=total_commission,
            pending_commission=pending_commission,
        ))

    return responses


@router.get("/me/commissions", response_model=list[CommissionResponse])
async def my_commissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Commission)
        .join(Promoter)
        .where(Promoter.user_id == current_user.id)
        .order_by(Commission.created_at.desc())
    )
    return result.scalars().all()


@router.get("/events/{event_id}/commissions", response_model=list[CommissionResponse])
async def list_event_commissions(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the organizer can view commissions")

    result = await db.execute(
        select(Commission)
        .join(Promoter)
        .where(Promoter.event_id == event_id)
        .order_by(Commission.created_at.desc())
    )
    return result.scalars().all()


@router.post("/events/{event_id}/commissions/{commission_id}/approve")
async def approve_commission(
    event_id: int,
    commission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event or event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    commission = await db.get(Commission, commission_id)
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    if commission.status != CommissionStatus.pending:
        raise HTTPException(status_code=400, detail="Commission is not pending")

    commission.status = CommissionStatus.approved
    await db.commit()
    return {"status": "approved"}


@router.post("/events/{event_id}/payouts")
async def mark_commissions_paid(
    event_id: int,
    body: CommissionPayoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event or event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for cid in body.commission_ids:
        commission = await db.get(Commission, cid)
        if commission and commission.status == CommissionStatus.approved:
            commission.status = CommissionStatus.paid
            commission.paid_at = datetime.now(timezone.utc)

    await db.commit()
    return {"status": "paid", "count": len(body.commission_ids)}
