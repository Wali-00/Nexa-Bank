from sqlalchemy import Column, Integer, String, Numeric
from database import Base


class AccountType(Base):
    __tablename__ = "account_types"

    account_type_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    type_name = Column(
        String(50),
        unique=True,
        nullable=False
    )

    minimum_balance = Column(
        Numeric(15, 2),
        nullable=False
    )

    interest_rate = Column(
        Numeric(5, 2),
        nullable=False
    )

    description = Column(
        String(255),
        nullable=True
    )