from sqlalchemy import Column, Integer, String
from database import Base


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, autoincrement=True)
    role_name = Column(String(40), unique=True, nullable=False)