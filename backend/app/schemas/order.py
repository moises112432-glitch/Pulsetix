from datetime import datetime

from pydantic import BaseModel


class OrderItemRequest(BaseModel):
    ticket_type_id: int
    quantity: int


class CheckoutRequest(BaseModel):
    event_id: int
    items: list[OrderItemRequest]
    promo_code: str | None = None
    ref: str | None = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    order_id: int


class TicketResponse(BaseModel):
    id: int
    ticket_type_name: str
    qr_code_token: str
    checked_in_at: datetime | None

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: int
    event_id: int
    total: float
    status: str
    created_at: datetime
    tickets: list[TicketResponse] = []
    event_title: str | None = None
    event_location: str | None = None
    event_start_time: str | None = None
    event_end_time: str | None = None
    event_cover_image: str | None = None
    event_organizer_id: int | None = None

    model_config = {"from_attributes": True}
