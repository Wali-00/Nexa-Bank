from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, text
from database import Base


class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(
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

    first_name = Column(
        String(50),
        nullable=False
    )

    last_name = Column(
        String(50),
        nullable=False
    )

    date_of_birth = Column(
        Date,
        nullable=False
    )

    nid = Column(
        String(30),
        unique=True,
        nullable=False
    )

    phone = Column(
        String(20),
        unique=True,
        nullable=False
    )

    email = Column(
        String(120),
        nullable=False
    )

    address = Column(
        String(255),
        nullable=False
    )

    occupation = Column(
        String(100),
        nullable=True
    )

    status = Column(
        Enum("ACTIVE", "INACTIVE", "BLOCKED"),
        nullable=False,
        default="ACTIVE"
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP")
    )
