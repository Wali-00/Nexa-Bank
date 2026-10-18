from pydantic import BaseModel, Field
from typing import Optional


class LoanDisbursementCreate(BaseModel):
    loan_id: int
    initiated_by_user_id: Optional[int] = None
    description: Optional[str] = None


class LoanPaymentCreate(BaseModel):
    loan_id: int
    account_id: int
    loan_payment_id: int
    amount: float = Field(gt=0)
    initiated_by_user_id: Optional[int] = None
    description: Optional[str] = None