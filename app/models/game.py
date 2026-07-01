from sqlalchemy import Column, Enum, Integer, String, Float, DateTime
from datetime import datetime, timezone
from app.core.database import Base
from app.models.enums import GameStatus


class Game(Base):
    __tablename__ = "games"
    id = Column(Integer, primary_key=True, index=True, nullable=False)

    # Informações do jogo
    title = Column(String, nullable=False, index=True)
    platform = Column(String, nullable=False, index=True)

    # Dados do usuário
    status = Column(Enum(GameStatus), nullable=False, index=True)
    personal_rating = Column(Float, nullable=True)
    hours_played = Column(Float, nullable=False, default=0.0)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Dados da API RAWG
    rawg_id = Column(Integer, nullable=True, index=True)
    cover_image = Column(String, nullable=True)
    release_date = Column(DateTime, nullable=True)
    genres = Column(String, nullable=True)
    metacritic_score = Column(Float, nullable=True)