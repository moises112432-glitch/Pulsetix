from datetime import datetime

from pydantic import BaseModel


class PromoterSignupResponse(BaseModel):
    id: int
    referral_code: str
    referral_url: str


class PromoterResponse(BaseModel):
    id: int
    user_id: int | None
    user_name: str | None
    email: str | None
    event_id: int
    referral_code: str
    personal_promo_code: str | None = None
    promo_code_discount_percent: float | None = None
    created_at: datetime
    total_sales: int = 0
    total_revenue: float = 0.0
    total_commission: float = 0.0


class CommissionResponse(BaseModel):
    id: int
    promoter_id: int
    order_id: int
    amount: float
    status: str
    paid_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PromoterDashboardResponse(BaseModel):
    event_id: int
    event_title: str
    referral_code: str
    referral_url: str
    personal_promo_code: str | None = None
    commission_percent: float
    total_sales: int = 0
    total_revenue: float = 0.0
    total_commission: float = 0.0
    pending_commission: float = 0.0


class CommissionPayoutRequest(BaseModel):
    commission_ids: list[int]


class PromoterInviteRequest(BaseModel):
    email: str
    personal_promo_code: str | None = None
    promo_code_discount_percent: float | None = None
