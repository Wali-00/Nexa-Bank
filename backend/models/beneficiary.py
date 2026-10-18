from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey, Enum, text
from database import Base


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    beneficiary_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.customer_id"),
        nullable=False
    )

    beneficiary_name = Column(
        String(100),
        nullable=False
    )

    bank_name = Column(
        String(100),
        nullable=False
    )

    account_number = Column(
        String(30),
        nullable=False
    )

    nickname = Column(
        String(50),
        nullable=True
    )

    status = Column(
        Enum("ACTIVE", "BLOCKED"),
        nullable=False,
        server_default=text("'ACTIVE'")
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP")
    )