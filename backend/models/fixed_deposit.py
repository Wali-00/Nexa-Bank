from sqlalchemy import Column, BigInteger, Integer, Date, Numeric, ForeignKey, Enum
from database import Base


class FixedDeposit(Base):
    __tablename__ = "fixed_deposits"

    fd_id = Column(
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

    principal_amount = Column(
        Numeric(18, 2),
        nullable=False
    )

    interest_rate = Column(
        Numeric(5, 2),
        nullable=False
    )

    start_date = Column(
        Date,
        nullable=False
    )

    maturity_date = Column(
        Date,
        nullable=False
    )

    maturity_amount = Column(
        Numeric(18, 2),
        nullable=False
    )

    status = Column(
        Enum(
            "ACTIVE",
            "MATURED",
            "CLOSED",
            "PREMATURELY_CLOSED"
        ),
        nullable=False,
        default="ACTIVE"
    )