from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class GameSession(Base):
    __tablename__ = "game_sessions"
    __table_args__ = (
        CheckConstraint(
            "duration_minutes > 0",
            name="ck_game_sessions_duration_positive",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(
        Integer,
        ForeignKey("games.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    played_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    duration_minutes = Column(Integer, nullable=False)
    notes = Column(String(2000), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    game = relationship("Game", back_populates="sessions")
    images = relationship(
        "GameSessionImage",
        back_populates="session",
        cascade="all, delete-orphan",
    )
