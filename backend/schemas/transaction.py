from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TransactionCreate(BaseModel):
    transaction_type_id: int
    reference_no: str = Field(min_length=1, max_length=40)
    initiated_by_user_id: Optional[int] = None
    amount: float = Field(gt=0)
    fee: float = Field(default=0.00, ge=0)
    description: Optional[str] = None
    
class TransactionUpdate(BaseModel):
    status: str
    fee: float = Field(ge=0)
    description: Optional[str] = None


class TransactionResponse(BaseModel):
    transaction_id: int
    transaction_type_id: int
    reference_no: str
    initiated_by_user_id: Optional[int]
    amount: float
    fee: float
    transaction_date: datetime
    status: str
    description: Optional[str]