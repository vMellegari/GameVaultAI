from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)
    discord_id = Column(String, unique=True, nullable=True, index=True)

    games = relationship("Game", back_populates="owner")
