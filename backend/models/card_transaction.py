from sqlalchemy import Column, BigInteger, String, ForeignKey
from database import Base


class CardTransaction(Base):
    __tablename__ = "card_transactions"

    card_transaction_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    card_id = Column(
        BigInteger,
        ForeignKey("cards.card_id"),
        nullable=False
    )

    transaction_id = Column(
        BigInteger,
        ForeignKey("transactions.transaction_id"),
        unique=True,
        nullable=False
    )

    merchant_name = Column(
        String(120),
        nullable=True
    )

    merchant_category = Column(
        String(80),
        nullable=True
    )