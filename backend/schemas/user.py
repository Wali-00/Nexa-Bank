from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    status: str
    last_login: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}

