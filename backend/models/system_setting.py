from sqlalchemy import Column, Integer, String, DateTime
from database import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"

    setting_id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    setting_key = Column(
        String(100),
        unique=True,
        nullable=False
    )

    setting_value = Column(
        String(500),
        nullable=False
    )

    description = Column(
        String(255),
        nullable=True
    )

    updated_at = Column(
        DateTime,
        nullable=False
    )