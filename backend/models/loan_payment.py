from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    Date,
    Numeric,
    ForeignKey,
    Enum
)
from database import Base


class LoanPayment(Base):
    __tablename__ = "loan_payments"

    loan_payment_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    loan_id = Column(
        BigInteger,
        ForeignKey("loans.loan_id"),
        nullable=False
    )

    transaction_id = Column(
        BigInteger,
        ForeignKey("transactions.transaction_id"),
        unique=True,
        nullable=True
    )

    installment_no = Column(
        Integer,
        nullable=False
    )

    due_date = Column(
        Date,
        nullable=False
    )

    payment_date = Column(
        Date,
        nullable=True
    )

    amount_due = Column(
        Numeric(15, 2),
        nullable=False
    )

    amount_paid = Column(
        Numeric(15, 2),
        nullable=False,
        default=0.00
    )

    late_fee = Column(
        Numeric(15, 2),
        nullable=False,
        default=0.00
    )

    status = Column(
        Enum(
            "UPCOMING",
            "PENDING",
            "PAID",
            "OVERDUE",
            "PARTIAL"
        ),
        nullable=False,
        default="UPCOMING"
    )