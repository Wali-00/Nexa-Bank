from sqlalchemy import (Column, BigInteger, Integer, String, Date, Numeric, ForeignKey, Enum, text)
from database import Base


class Account(Base):
    __tablename__ = "accounts"

    account_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    account_number = Column(
        String(30),
        unique=True,
        nullable=False
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

    balance = Column(
        Numeric(18, 2),
        nullable=False
    )

    available_balance = Column(
        Numeric(18, 2),
        nullable=False
    )

    opened_date = Column(
        Date,
        nullable=False
    )

    status = Column(
        Enum(
            "PENDING",
            "ACTIVE",
            "FROZEN",
            "CLOSED"
        ),
        nullable=False,
        server_default=text("'PENDING'")
    )