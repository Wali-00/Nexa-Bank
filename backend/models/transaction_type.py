from sqlalchemy import Column, Integer, String
from database import Base


class TransactionType(Base):
    __tablename__ = "transaction_types"

    transaction_type_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    type_name = Column(
        String(50),
        unique=True,
        nullable=False
    )

    description = Column(
        String(255),
        nullable=True
    )