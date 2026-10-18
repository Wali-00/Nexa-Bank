from pydantic import BaseModel


class LoginRequest(BaseModel):
    username_or_email: str
    password: str
    role: str


class LoginResponse(BaseModel):
    message: str
    user_id: int
    role: str
    customer_id: int | None = None

