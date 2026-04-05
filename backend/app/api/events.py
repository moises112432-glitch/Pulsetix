import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.event import Event, EventStatus
from app.models.ticket import Order, OrderStatus, Ticket, TicketType
from app.models.user import User
from app.schemas.event import EventCreate, EventListResponse, EventResponse, EventUpdate

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")

router = APIRouter(prefix="/api/events", tags=["events"])


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = Event(
        organizer_id=current_user.id,
        title=body.title,
        description=body.description,
        location=body.location,
        start_time=body.start_time,
        end_time=body.end_time,
        status=EventStatus.draft,
        affiliate_enabled=body.affiliate_enabled,
        affiliate_commission_percent=body.affiliate_commission_percent,
    )
    db.add(event)
    await db.flush()

    for i, tt in enumerate(body.ticket_types):
        db.add(TicketType(
            event_id=event.id,
            name=tt.name,
            price=tt.price,
            quantity_total=tt.quantity_total,
            tier_order=tt.tier_order if tt.tier_order else i,
        ))

    await db.commit()
    result = await db.execute(
        select(Event).where(Event.id == event.id).options(selectinload(Event.ticket_types))
    )
    return result.scalar_one()


@router.get("/", response_model=list[EventListResponse])
async def list_events(
    skip: int = 0,
    limit: int = 20,
    q: str | None = None,
    location: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort: str = "date",
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime

    query = select(Event).where(Event.status == EventStatus.published)

    if q:
        query = query.where(Event.title.ilike(f"%{q}%"))

    if location:
        query = query.where(Event.location.ilike(f"%{location}%"))

    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            query = query.where(Event.start_time >= dt)
        except ValueError:
            pass

    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.where(Event.start_time <= dt)
        except ValueError:
            pass

    if sort == "price":
        # Sort by cheapest available ticket
        query = query.order_by(Event.start_time)
    elif sort == "newest":
        query = query.order_by(Event.created_at.desc())
    else:
        query = query.order_by(Event.start_time)

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.ticket_types), selectinload(Event.organizer))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    resp = EventResponse.model_validate(event)
    resp.organizer_name = event.organizer.name if event.organizer else None
    return resp


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    body: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id).options(selectinload(Event.ticket_types))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    await db.commit()
    result = await db.execute(
        select(Event).where(Event.id == event_id).options(selectinload(Event.ticket_types))
    )
    return result.scalar_one()


@router.post("/{event_id}/publish", response_model=EventResponse)
async def publish_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id).options(selectinload(Event.ticket_types))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if event.status != EventStatus.draft:
        raise HTTPException(status_code=400, detail="Only draft events can be published")

    event.status = EventStatus.published
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/me/organized", response_model=list[EventListResponse])
async def my_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Event)
        .where(Event.organizer_id == current_user.id)
        .order_by(Event.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{event_id}/cover")
async def upload_cover_image(
    event_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    contents = await file.read()

    if settings.S3_ENDPOINT_URL and settings.S3_ACCESS_KEY_ID:
        # Production: upload to S3/R2
        import boto3
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        )
        s3.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=f"covers/{filename}",
            Body=contents,
            ContentType=file.content_type or "image/jpeg",
        )
        event.cover_image = f"{settings.S3_PUBLIC_URL}/covers/{filename}"
    else:
        # Development: save locally
        filepath = os.path.join(UPLOAD_DIR, filename)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(contents)
        event.cover_image = f"/api/uploads/{filename}"

    await db.commit()

    return {"cover_image": event.cover_image}


@router.get("/{event_id}/stats")
async def get_event_stats(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Total tickets sold
    tickets_sold_result = await db.execute(
        select(func.count(Ticket.id))
        .join(Order, Ticket.order_id == Order.id)
        .where(Order.event_id == event_id, Order.status == OrderStatus.completed)
    )
    tickets_sold = tickets_sold_result.scalar() or 0

    # Total revenue
    revenue_result = await db.execute(
        select(func.sum(Order.total))
        .where(Order.event_id == event_id, Order.status == OrderStatus.completed)
    )
    revenue = float(revenue_result.scalar() or 0)

    # Check-ins
    checkins_result = await db.execute(
        select(func.count(Ticket.id))
        .join(Order, Ticket.order_id == Order.id)
        .where(
            Order.event_id == event_id,
            Order.status == OrderStatus.completed,
            Ticket.checked_in_at.isnot(None),
        )
    )
    checkins = checkins_result.scalar() or 0

    # Total capacity
    capacity_result = await db.execute(
        select(func.sum(TicketType.quantity_total))
        .where(TicketType.event_id == event_id)
    )
    total_capacity = capacity_result.scalar() or 0

    # Orders count
    orders_result = await db.execute(
        select(func.count(Order.id))
        .where(Order.event_id == event_id, Order.status == OrderStatus.completed)
    )
    total_orders = orders_result.scalar() or 0

    return {
        "tickets_sold": tickets_sold,
        "total_capacity": total_capacity,
        "revenue": revenue,
        "checkins": checkins,
        "total_orders": total_orders,
    }
