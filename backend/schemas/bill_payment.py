from pydantic import BaseModel, Field
from typing import Optional


class BillPaymentCreate(BaseModel):
    customer_id: int
    account_id: int
    biller_id: int
    customer_reference: Optional[str] = None
    amount: float = Field(gt=0)
    initiated_by_user_id: Optional[int] = None