import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import Follow, User, UserRole
from app.schemas.auth import UserResponse

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/api/users", tags=["users"])


# ── /me routes must come before /{user_id} to avoid route conflicts ──

@router.post("/me/become-organizer", response_model=UserResponse)
async def become_organizer(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.organizer:
        current_user.role = UserRole.organizer
        await db.commit()
        await db.refresh(current_user)
    return current_user


@router.get("/me/following")
async def my_following(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User)
        .join(Follow, Follow.following_id == User.id)
        .where(Follow.follower_id == current_user.id)
        .order_by(User.name)
    )
    users = result.scalars().all()
    return [{"id": u.id, "name": u.name, "avatar": u.avatar} for u in users]


# ── Stripe Connect ──────────────────────────────────────────────

@router.post("/me/connect-stripe")
async def create_connect_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Express account and return an onboarding link."""
    if current_user.role not in (UserRole.organizer, UserRole.admin):
        raise HTTPException(status_code=403, detail="Must be an organizer")

    try:
        # If user has an old/invalid account ID, verify it still works
        if current_user.stripe_account_id:
            try:
                stripe.Account.retrieve(current_user.stripe_account_id)
            except stripe.error.InvalidRequestError:
                # Old account ID is invalid (e.g. test mode ID with live key), clear it
                current_user.stripe_account_id = None
                current_user.stripe_onboarding_complete = False
                await db.commit()

        # Create account if user doesn't have one yet
        if not current_user.stripe_account_id:
            account = stripe.Account.create(
                type="express",
                email=current_user.email,
                metadata={"user_id": str(current_user.id)},
            )
            current_user.stripe_account_id = account.id
            current_user.stripe_onboarding_complete = False
            await db.commit()
            await db.refresh(current_user)

        # Generate onboarding link
        link = stripe.AccountLink.create(
            account=current_user.stripe_account_id,
            refresh_url=f"{settings.FRONTEND_URL}/dashboard?stripe=refresh",
            return_url=f"{settings.FRONTEND_URL}/dashboard?stripe=complete",
            type="account_onboarding",
        )

        return {"url": link.url}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/me/connect-status")
async def connect_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if the organizer's Stripe account is fully onboarded."""
    if not current_user.stripe_account_id:
        return {"connected": False, "details_submitted": False, "charges_enabled": False}

    try:
        account = stripe.Account.retrieve(current_user.stripe_account_id)
    except stripe.error.InvalidRequestError:
        # Old/invalid account ID — clear it
        current_user.stripe_account_id = None
        current_user.stripe_onboarding_complete = False
        await db.commit()
        return {"connected": False, "details_submitted": False, "charges_enabled": False}

    # Update our record if onboarding just completed
    if account.details_submitted and not current_user.stripe_onboarding_complete:
        current_user.stripe_onboarding_complete = True
        await db.commit()

    return {
        "connected": True,
        "details_submitted": account.details_submitted,
        "charges_enabled": account.charges_enabled,
        "payouts_enabled": account.payouts_enabled,
    }


@router.post("/me/connect-dashboard")
async def connect_dashboard_link(
    current_user: User = Depends(get_current_user),
):
    """Generate a link to the Stripe Express dashboard for the organizer."""
    if not current_user.stripe_account_id:
        raise HTTPException(status_code=400, detail="No Stripe account connected")

    link = stripe.Account.create_login_link(current_user.stripe_account_id)
    return {"url": link.url}


# ── Dynamic /{user_id} routes (must be AFTER /me/ routes) ──────

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/follow", status_code=201)
async def follow_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = await db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already following")

    db.add(Follow(follower_id=current_user.id, following_id=user_id))
    await db.commit()
    return {"detail": "Followed"}


@router.delete("/{user_id}/follow", status_code=200)
async def unfollow_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    )
    follow = result.scalar_one_or_none()
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")

    await db.delete(follow)
    await db.commit()
    return {"detail": "Unfollowed"}


@router.get("/{user_id}/followers/count")
async def follower_count(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count()).where(Follow.following_id == user_id)
    )
    return {"count": result.scalar()}


@router.get("/{user_id}/is-following")
async def is_following(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    return {"following": result.scalar_one_or_none() is not None}
