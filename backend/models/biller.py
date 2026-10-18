from sqlalchemy import Column, Integer, String, Enum
from database import Base


class Biller(Base):
    __tablename__ = "billers"

    biller_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    biller_name = Column(
        String(120),
        unique=True,
        nullable=False
    )

    category = Column(
        String(80),
        nullable=False
    )

    status = Column(
        Enum("ACTIVE", "INACTIVE"),
        nullable=False,
        default="ACTIVE"
    )