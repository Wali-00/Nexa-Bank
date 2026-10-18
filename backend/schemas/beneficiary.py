from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BeneficiaryCreate(BaseModel):
    customer_id: int
    beneficiary_name: str
    bank_name: str
    account_number: str
    nickname: Optional[str] = None


class BeneficiaryUpdate(BaseModel):
    beneficiary_name: str
    bank_name: str
    account_number: str
    nickname: Optional[str] = None
    status: str


class BeneficiaryResponse(BaseModel):
    beneficiary_id: int
    customer_id: int
    beneficiary_name: str
    bank_name: str
    account_number: str
    nickname: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }