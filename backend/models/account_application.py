from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey, Enum, text
from database import Base


class AccountApplication(Base):
    __tablename__ = "account_applications"

    application_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.customer_id"),
        nullable=False
    )

    account_type_id = Column(
        Integer,
        ForeignKey("account_types.account_type_id"),
        nullable=False
    )

    branch_id = Column(
        Integer,
        ForeignKey("branches.branch_id"),
        nullable=False
    )

    reviewed_by = Column(
        Integer,
        ForeignKey("employees.employee_id"),
        nullable=True
    )

    submitted_at = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP")
    )

    reviewed_at = Column(
        DateTime,
        nullable=True
    )

    status = Column(
        Enum(
            "SUBMITTED",
            "UNDER_REVIEW",
            "APPROVED",
            "REJECTED"
        ),
        nullable=False,
        default="SUBMITTED"
    )

    rejection_reason = Column(
        String(255),
        nullable=True
    )