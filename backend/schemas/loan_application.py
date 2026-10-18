from pydantic import BaseModel, Field
from typing import Optional


class LoanApplicationCreate(BaseModel):
    customer_id: int
    loan_type_id: int
    requested_amount: float = Field(gt=0)
    duration_months: int = Field(gt=0)
    purpose: str
    monthly_income: float = Field(gt=0)
    employment: Optional[str] = None


class LoanApplicationReview(BaseModel):
    status: str
    assigned_officer_id: Optional[int] = None
    rejection_reason: Optional[str] = None


class ApprovedLoanCreate(BaseModel):
    disbursement_account_id: int