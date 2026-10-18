from sqlalchemy import Column, BigInteger, ForeignKey, Enum, Numeric
from database import Base


class TransactionEntry(Base):
    __tablename__ = "transaction_entries"

    entry_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    transaction_id = Column(
        BigInteger,
        ForeignKey("transactions.transaction_id"),
        nullable=False
    )

    account_id = Column(
        BigInteger,
        ForeignKey("accounts.account_id"),
        nullable=False
    )

    entry_type = Column(
        Enum("DEBIT", "CREDIT"),
        nullable=False
    )

    amount = Column(
        Numeric(18, 2),
        nullable=False
    )