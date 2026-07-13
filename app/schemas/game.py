from datetime import date

from pydantic import BaseModel, Field
from typing import Optional

class GameBase(BaseModel):
    title: str
    platform: str

class GameCreate(GameBase):
    pass

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
    rawg_id: Optional[int] = None
    cover_image: Optional[str] = None
    release_date: Optional[date] = None
    genres: Optional[str] = None
    metacritic_score: Optional[float] = None
    favorite: bool

    class Config:
        from_attributes = True 