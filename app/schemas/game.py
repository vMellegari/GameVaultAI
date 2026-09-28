from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.models.enums import GameStatus, GameType

class GameBase(BaseModel):
    title: str
    platform: str

class GameCreate(GameBase):
    title: str
    platform: str
    game_type: GameType = GameType.STANDARD

class GameUpdate(BaseModel):
    platform: Optional[str] = None
    status: Optional[GameStatus] = None
    game_type: Optional[GameType] = None
    personal_rating: Optional[float] = Field(default=None, ge=0, le=10)
    hours_played: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None
    favorite: Optional[bool] = None

    @field_validator("game_type", mode="before")
    @classmethod
    def game_type_cannot_be_null(cls, value):
        if value is None:
            raise ValueError("O tipo do jogo não pode ser nulo.")
        return value
    
class GameResponse(GameBase):
    id: int
    status: str
    game_type: GameType

    personal_rating: float | None = None
    hours_played: float
    notes: str | None = None

    favorite: bool

    rawg_id: int | None = None
    cover_image: str | None = None
    release_date: date | None = None
    genres: str | None = None
    metacritic_score: float | None = None
    completed_at: datetime | None = None

    class Config:
        from_attributes = True
