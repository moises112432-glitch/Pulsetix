from datetime import datetime

from pydantic import BaseModel


class TicketTypeCreate(BaseModel):
    name: str
    price: float
    quantity_total: int
    tier_order: int = 0


class TicketTypeResponse(BaseModel):
    id: int
    name: str
    price: float
    quantity_total: int
    quantity_sold: int
    tier_order: int

    model_config = {"from_attributes": True}


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    start_time: datetime
    end_time: datetime
    ticket_types: list[TicketTypeCreate] = []
    affiliate_mode: str = "off"
    affiliate_commission_percent: float | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    affiliate_mode: str | None = None
    affiliate_commission_percent: float | None = None


class EventResponse(BaseModel):
    id: int
    organizer_id: int
    organizer_name: str | None = None
    title: str
    description: str | None
    location: str | None
    start_time: datetime
    end_time: datetime
    cover_image: str | None
    status: str
    affiliate_mode: str = "off"
    affiliate_commission_percent: float | None = None
    created_at: datetime
    ticket_types: list[TicketTypeResponse] = []

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    id: int
    title: str
    location: str | None
    start_time: datetime
    cover_image: str | None
    status: str
    organizer_id: int
    affiliate_mode: str = "off"
    affiliate_commission_percent: float | None = None

    model_config = {"from_attributes": True}
