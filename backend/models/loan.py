from sqlalchemy import Column, BigInteger, Integer, Numeric, Date, ForeignKey, Enum
from database import Base


class Loan(Base):
    __tablename__ = "loans"

    loan_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    loan_application_id = Column(
        BigInteger,
        ForeignKey("loan_applications.loan_application_id"),
        unique=True,
        nullable=False
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

    disbursement_account_id = Column(
        BigInteger,
        ForeignKey("accounts.account_id"),
        nullable=False
    )

    principal_amount = Column(
        Numeric(18, 2),
        nullable=False
    )

    outstanding_amount = Column(
        Numeric(18, 2),
        nullable=False
    )

    interest_rate = Column(
        Numeric(5, 2),
        nullable=False
    )

    duration_months = Column(
        Integer,
        nullable=False
    )

    monthly_emi = Column(
        Numeric(15, 2),
        nullable=False
    )

    disbursement_date = Column(
        Date,
        nullable=True
    )

    status = Column(
        Enum(
            "APPROVED",
            "ACTIVE",
            "COMPLETED",
            "DEFAULTED",
            "CLOSED"
        ),
        nullable=False,
        default="APPROVED"
    )