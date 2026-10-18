from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional


class AccountCreate(BaseModel):
    account_number: str
    customer_id: int
    account_type_id: int
    branch_id: int
    balance: Decimal
    available_balance: Decimal
    opened_date: date


class AccountUpdate(BaseModel):
    balance: Decimal
    available_balance: Decimal
    status: str


class AccountResponse(BaseModel):
    account_id: int
    account_number: str
    customer_id: int
    account_type_id: int
    branch_id: int
    balance: Decimal
    available_balance: Decimal
    opened_date: date
    status: str

    model_config = {
        "from_attributes": True
    }