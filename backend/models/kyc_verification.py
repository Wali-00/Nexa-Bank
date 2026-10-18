from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey, Enum
from database import Base


class KYCVerification(Base):
    __tablename__ = "kyc_verifications"

    kyc_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.customer_id"),
        nullable=False
    )

    application_id = Column(
        BigInteger,
        ForeignKey("account_applications.application_id"),
        nullable=True
    )

    verified_by = Column(
        Integer,
        ForeignKey("employees.employee_id"),
        nullable=True
    )

    nid_document = Column(
        String(255),
        nullable=True
    )

    photo_document = Column(
        String(255),
        nullable=True
    )

    address_document = Column(
        String(255),
        nullable=True
    )

    status = Column(
        Enum(
            "PENDING",
            "VERIFIED",
            "REJECTED",
            "DOCUMENT_REQUIRED"
        ),
        nullable=False,
        default="PENDING"
    )

    verified_at = Column(
        DateTime,
        nullable=True
    )

    remarks = Column(
        String(255),
        nullable=True
    )