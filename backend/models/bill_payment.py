from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Numeric, ForeignKey, Enum
from database import Base


class BillPayment(Base):
    __tablename__ = "bill_payments"

    bill_payment_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.customer_id"),
        nullable=False
    )

    account_id = Column(
        BigInteger,
        ForeignKey("accounts.account_id"),
        nullable=False
    )

    biller_id = Column(
        Integer,
        ForeignKey("billers.biller_id"),
        nullable=False
    )

    transaction_id = Column(
        BigInteger,
        ForeignKey("transactions.transaction_id"),
        unique=True,
        nullable=False
    )

    customer_reference = Column(
        String(80),
        nullable=False
    )

    amount = Column(
        Numeric(15, 2),
        nullable=False
    )

    payment_date = Column(
        DateTime,
        nullable=False
    )

    status = Column(
        Enum(
            "PENDING",
            "SUCCESS",
            "FAILED"
        ),
        nullable=False,
        default="PENDING"
    )