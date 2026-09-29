from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class GameSessionImage(Base):
    __tablename__ = "game_session_images"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer,
        ForeignKey("game_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    storage_key = Column(String(36), nullable=False, unique=True)
    original_filename = Column(String(255), nullable=False)
    content_type = Column(String(32), nullable=False)
    file_size = Column(Integer, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    session = relationship("GameSession", back_populates="images")
