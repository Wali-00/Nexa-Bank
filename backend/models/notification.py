from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Boolean, ForeignKey
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        nullable=False
    )

    title = Column(
        String(150),
        nullable=False
    )

    message = Column(
        String(500),
        nullable=False
    )

    notification_type = Column(
        String(50),
        nullable=False
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at = Column(
        DateTime,
        nullable=False
    )