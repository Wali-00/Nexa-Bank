from sqlalchemy import Column, BigInteger, Integer, String, Date, ForeignKey, Enum
from database import Base


class Card(Base):
    __tablename__ = "cards"

    card_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    account_id = Column(
        BigInteger,
        ForeignKey("accounts.account_id"),
        nullable=False
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.customer_id"),
        nullable=False
    )

    card_number_hash = Column(
        String(255),
        unique=True,
        nullable=False
    )

    card_type = Column(
        Enum("DEBIT", "CREDIT"),
        nullable=False
    )

    expiry_date = Column(
        Date,
        nullable=False
    )

    status = Column(
        Enum(
            "ACTIVE",
            "BLOCKED",
            "EXPIRED",
            "CANCELLED"
        ),
        nullable=False,
        default="ACTIVE"
    )

    issued_date = Column(
        Date,
        nullable=False
    )