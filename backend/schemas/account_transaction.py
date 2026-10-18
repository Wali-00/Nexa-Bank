from pydantic import BaseModel, Field
from decimal import Decimal


class AccountTransactionCreate(BaseModel):
    account_id: int
    initiated_by_user_id: int
    amount: Decimal = Field(gt=0)
    description: str | None = None


class OfficerDepositCreate(BaseModel):
    account_number: str
    amount: Decimal = Field(gt=0)
    initiated_by_user_id: int
    description: str | None = None