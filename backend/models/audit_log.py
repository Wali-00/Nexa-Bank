from sqlalchemy import Column, BigInteger, Integer, String, DateTime, JSON, ForeignKey
from database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=True
    )

    action = Column(
        String(100),
        nullable=False
    )

    entity_type = Column(
        String(50),
        nullable=False
    )

    entity_id = Column(
        BigInteger,
        nullable=True
    )

    old_value = Column(
        JSON,
        nullable=True
    )

    new_value = Column(
        JSON,
        nullable=True
    )

    ip_address = Column(
        String(45),
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False
    )