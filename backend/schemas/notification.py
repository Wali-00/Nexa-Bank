from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    user_id: int
    title: str = Field(min_length=1, max_length=150)
    message: str = Field(min_length=1, max_length=500)
    notification_type: str = Field(min_length=1, max_length=50)