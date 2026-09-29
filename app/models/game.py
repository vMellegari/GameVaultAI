from sqlalchemy import Boolean, CheckConstraint, Column, Date, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
from app.models.enums import GameStatus, GameType


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (
        CheckConstraint(
            "game_type != 'ONGOING' OR status != 'COMPLETED'",
            name="ck_games_ongoing_not_completed",
        ),
    )

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="games")

    # Informações do jogo
    title = Column(String, nullable=False, index=True)
    platform = Column(String, nullable=False, index=True)

    # Dados do usuário
    status = Column(Enum(GameStatus), nullable=False, index=True)
    game_type = Column(
        Enum(GameType, name="gametype"),
        nullable=False,
        default=GameType.STANDARD,
        server_default=GameType.STANDARD.value,
    )
    personal_rating = Column(Float, nullable=True)
    hours_played = Column(Float, nullable=False, default=0.0)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    favorite = Column(Boolean, default=False, nullable=False)
    completed_at = Column(Date, nullable=True)

    sessions = relationship(
        "GameSession",
        back_populates="game",
        cascade="all, delete-orphan",
    )

    # Dados da API RAWG
    rawg_id = Column(Integer, nullable=True, index=True)
    cover_image = Column(String, nullable=True)
    release_date = Column(Date, nullable=True)
    genres = Column(String, nullable=True)
    metacritic_score = Column(Float, nullable=True)
