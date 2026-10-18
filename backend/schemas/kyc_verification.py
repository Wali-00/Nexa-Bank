from pydantic import BaseModel
from typing import Optional


class KYCVerificationCreate(BaseModel):
    customer_id: int
    application_id: Optional[int] = None
    nid_document: Optional[str] = None
    photo_document: Optional[str] = None
    address_document: Optional[str] = None


class KYCVerificationReview(BaseModel):
    status: str
    verified_by: Optional[int] = None
    remarks: Optional[str] = None