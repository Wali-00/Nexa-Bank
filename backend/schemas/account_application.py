from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AccountApplicationCreate(BaseModel):
    customer_id: int
    account_type_id: int
    branch_id: int


class AccountApplicationUpdate(BaseModel):
    status: str
    reviewed_by: Optional[int] = None
    rejection_reason: Optional[str] = None


class AccountApplicationResponse(BaseModel):
    application_id: int
    customer_id: int
    account_type_id: int
    branch_id: int
    reviewed_by: Optional[int] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    status: str
    rejection_reason: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

