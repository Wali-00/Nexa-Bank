from pydantic import BaseModel, Field
from typing import Optional


class CardPaymentCreate(BaseModel):
    card_id: int
    amount: float = Field(gt=0)
    merchant_name: Optional[str] = None
    merchant_category: Optional[str] = None
    initiated_by_user_id: Optional[int] = None
    description: Optional[str] = None