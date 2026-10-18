from sqlalchemy import Column, Integer, ForeignKey
from database import Base


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        primary_key=True,
        nullable=False
    )

    role_id = Column(
        Integer,
        ForeignKey("roles.role_id"),
        primary_key=True,
        nullable=False
    )