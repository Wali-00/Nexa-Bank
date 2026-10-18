from sqlalchemy import Column, Integer, String, Numeric
from database import Base


class LoanType(Base):
    __tablename__ = "loan_types"

    loan_type_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    type_name = Column(
        String(60),
        unique=True,
        nullable=False
    )

    interest_rate = Column(
        Numeric(5, 2),
        nullable=False
    )

    max_amount = Column(
        Numeric(18, 2),
        nullable=False
    )

    max_duration_months = Column(
        Integer,
        nullable=False
    )