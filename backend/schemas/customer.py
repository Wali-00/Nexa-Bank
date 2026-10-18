from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class CustomerCreate(BaseModel):
    user_id: int | None = None
    branch_id: int
    first_name: str
    last_name: str
    date_of_birth: date
    nid: str
    phone: str
    email: str
    address: str
    occupation: Optional[str] = None


class CustomerUpdate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    phone: str
    email: str
    address: str
    occupation: Optional[str] = None

class CustomerResponse(BaseModel):
    customer_id: int
    user_id: Optional[int] = None
    branch_id: int
    first_name: str
    last_name: str
    date_of_birth: date
    nid: str
    phone: str
    email: str
    address: str
    occupation: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }