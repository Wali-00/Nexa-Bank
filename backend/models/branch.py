from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from database import Base


class Branch(Base):
    __tablename__ = "branches"

    branch_id = Column(Integer, primary_key=True, autoincrement=True)
    branch_code = Column(String(20), unique=True, nullable=False)
    branch_name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(80), nullable=False)
    phone = Column(String(20), nullable=True)

    manager_employee_id = Column(
        Integer,
        ForeignKey("employees.employee_id"),
        nullable=True
    )

    status = Column(
        Enum("ACTIVE", "INACTIVE"),
        nullable=False,
        default="ACTIVE"
    )