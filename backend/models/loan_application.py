from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Numeric, ForeignKey, Enum
from database import Base


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    loan_application_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.customer_id"),
        nullable=False
    )

    loan_type_id = Column(
        Integer,
        ForeignKey("loan_types.loan_type_id"),
        nullable=False
    )

    assigned_officer_id = Column(
        Integer,
        ForeignKey("employees.employee_id"),
        nullable=True
    )

    requested_amount = Column(
        Numeric(18, 2),
        nullable=False
    )

    duration_months = Column(
        Integer,
        nullable=False
    )

    purpose = Column(
        String(255),
        nullable=False
    )

    monthly_income = Column(
        Numeric(15, 2),
        nullable=False
    )

    employment = Column(
        String(100),
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

    submitted_at = Column(
        DateTime,
        nullable=False
    )

    reviewed_at = Column(
        DateTime,
        nullable=True
    )

    rejection_reason = Column(
        String(255),
        nullable=True
    )