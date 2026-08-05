from datetime import date, datetime

from pydantic import BaseModel, Field
from typing import Optional

class GameBase(BaseModel):
    title: str
    platform: str

class GameCreate(GameBase):
    title: str
    platform: str

class GameUpdate(BaseModel):
    platform: Optional[str] = None
    status: Optional[str] = None
    personal_rating: Optional[float] = Field(default=None, ge=0, le=10)
    hours_played: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None
    favorite: Optional[bool] = None
    
class GameResponse(GameBase):
    id: int
    status: str

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