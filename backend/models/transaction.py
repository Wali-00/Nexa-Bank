from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Numeric, ForeignKey, Enum
from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    transaction_type_id = Column(
        Integer,
        ForeignKey("transaction_types.transaction_type_id"),
        nullable=False
    )

    reference_no = Column(
        String(40),
        unique=True,
        nullable=False
    )

    initiated_by_user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=True
    )

    amount = Column(
        Numeric(18, 2),
        nullable=False
    )

    fee = Column(
        Numeric(15, 2),
        nullable=False,
        default=0.00
    )

    transaction_date = Column(
        DateTime,
        nullable=False
    )

    status = Column(
        Enum(
            "PENDING",
            "SUCCESS",
            "FAILED",
            "REVERSED"
        ),
        nullable=False,
        default="PENDING"
    )

    description = Column(
        String(255),
        nullable=True
    )