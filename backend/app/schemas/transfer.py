from datetime import datetime

from pydantic import BaseModel, EmailStr


class TransferInitiateRequest(BaseModel):
    ticket_id: int
    recipient_email: EmailStr


class TransferInitiateResponse(BaseModel):
    transfer_id: int
    recipient_email: str
    status: str
    created_at: datetime


class TransferClaimInfo(BaseModel):
    transfer_id: int
    event_title: str
    ticket_type: str
    sender_name: str
    status: str


class TransferClaimResponse(BaseModel):
    ticket_id: int
    qr_code_token: str
    event_title: str
    ticket_type: str


class TransferResponse(BaseModel):
    id: int
    ticket_id: int
    sender_name: str
    recipient_email: str
    status: str
    event_title: str
    ticket_type: str
    created_at: datetime
    claimed_at: datetime | None
    cancelled_at: datetime | None
