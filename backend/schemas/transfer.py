from pydantic import BaseModel, Field
from typing import Optional


class TransferCreate(BaseModel):
    sender_account_id: int
    receiver_account_id: int
    amount: float = Field(gt=0)
    initiated_by_user_id: Optional[int] = None
    description: Optional[str] = None