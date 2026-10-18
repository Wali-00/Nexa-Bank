from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey, Enum
from database import Base


class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        unique=True,
        nullable=True
    )

    branch_id = Column(
        Integer,
        ForeignKey("branches.branch_id"),
        nullable=False
    )

    department_id = Column(
        Integer,
        ForeignKey("departments.department_id"),
        nullable=False
    )

    position_id = Column(
        Integer,
        ForeignKey("positions.position_id"),
        nullable=False
    )

    first_name = Column(
        String(50),
        nullable=False
    )

    last_name = Column(
        String(50),
        nullable=False
    )

    nid = Column(
        String(30),
        unique=True,
        nullable=False
    )

    phone = Column(
        String(20),
        nullable=False
    )

    joining_date = Column(
        Date,
        nullable=False
    )

    salary = Column(
        Numeric(12, 2),
        nullable=False
    )

    status = Column(
        Enum("ACTIVE", "ON_LEAVE", "INACTIVE"),
        nullable=False,
        default="ACTIVE"
    )