from datetime import datetime

from pydantic import BaseModel, field_validator


class PromoCodeCreate(BaseModel):
    code: str
    discount_percent: float
    max_uses: int | None = None

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("discount_percent")
    @classmethod
    def valid_discount(cls, v: float) -> float:
        if v <= 0 or v > 100:
            raise ValueError("Discount must be between 1 and 100")
        return v


class PromoCodeResponse(BaseModel):
    id: int
    event_id: int
    code: str
    discount_percent: float
    max_uses: int | None
    times_used: int
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PromoCodeValidateRequest(BaseModel):
    code: str
    event_id: int


class PromoCodeValidateResponse(BaseModel):
    valid: bool
    discount_percent: float = 0
    message: str = ""
