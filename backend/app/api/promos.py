from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.event import Event
from app.models.promo import PromoCode
from app.models.promoter import Promoter
from app.models.user import User
from app.schemas.promo import (
    PromoCodeCreate,
    PromoCodeResponse,
    PromoCodeValidateRequest,
    PromoCodeValidateResponse,
)

router = APIRouter(prefix="/api/promos", tags=["promos"])


@router.post("/events/{event_id}", response_model=PromoCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_promo_code(
    event_id: int,
    body: PromoCodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check for duplicate code on this event
    existing = await db.execute(
        select(PromoCode).where(
            PromoCode.event_id == event_id,
            PromoCode.code == body.code,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A promo code with this name already exists for this event")

    promo = PromoCode(
        event_id=event_id,
        code=body.code,
        discount_percent=body.discount_percent,
        max_uses=body.max_uses,
    )
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return promo


@router.get("/events/{event_id}", response_model=list[PromoCodeResponse])
async def list_promo_codes(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(PromoCode)
        .where(PromoCode.event_id == event_id)
        .order_by(PromoCode.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/{promo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_promo_code(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    promo = await db.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")

    event = await db.get(Event, promo.event_id)
    if not event or event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(promo)
    await db.commit()


@router.patch("/{promo_id}/toggle", response_model=PromoCodeResponse)
async def toggle_promo_code(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    promo = await db.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")

    event = await db.get(Event, promo.event_id)
    if not event or event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    promo.active = not promo.active
    await db.commit()
    await db.refresh(promo)
    return promo


@router.post("/validate", response_model=PromoCodeValidateResponse)
async def validate_promo_code(
    body: PromoCodeValidateRequest,
    db: AsyncSession = Depends(get_db),
):
    code = body.code.strip().upper()
    result = await db.execute(
        select(PromoCode).where(
            PromoCode.event_id == body.event_id,
            PromoCode.code == code,
        )
    )
    promo = result.scalar_one_or_none()

    if not promo:
        # Also check promoter personal promo codes
        promoter_result = await db.execute(
            select(Promoter).where(
                Promoter.personal_promo_code == code,
                Promoter.event_id == body.event_id,
            )
        )
        promoter = promoter_result.scalar_one_or_none()
        if promoter and promoter.promo_code_discount_percent:
            return PromoCodeValidateResponse(
                valid=True,
                discount_percent=float(promoter.promo_code_discount_percent),
                message=f"{float(promoter.promo_code_discount_percent):.0f}% discount applied!",
            )
        elif promoter:
            # Promoter code exists but no discount — still valid for attribution
            return PromoCodeValidateResponse(
                valid=True,
                discount_percent=0,
                message="Promo code applied!",
            )
        return PromoCodeValidateResponse(valid=False, message="Invalid promo code")

    if not promo.active:
        return PromoCodeValidateResponse(valid=False, message="This promo code is no longer active")

    if promo.max_uses and promo.times_used >= promo.max_uses:
        return PromoCodeValidateResponse(valid=False, message="This promo code has been fully redeemed")

    return PromoCodeValidateResponse(
        valid=True,
        discount_percent=float(promo.discount_percent),
        message=f"{float(promo.discount_percent):.0f}% discount applied!",
    )
