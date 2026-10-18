from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base


class Position(Base):
    __tablename__ = "positions"

    position_id = Column(Integer, primary_key=True, autoincrement=True)
    position_name = Column(String(80), unique=True, nullable=False)
    department_id = Column(
        Integer,
        ForeignKey("departments.department_id"),
        nullable=False
    )
    description = Column(String(255), nullable=True)