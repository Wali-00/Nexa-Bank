from pydantic import BaseModel, Field
from datetime import date


class FixedDepositCreate(BaseModel):
    customer_id: int
    account_id: int
    principal_amount: float = Field(gt=0)
    interest_rate: float = Field(gt=0)
    start_date: date
    maturity_date: date