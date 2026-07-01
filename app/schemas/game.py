from datetime import date

from pydantic import BaseModel
from typing import Optional

class GameBase(BaseModel):
    title: str
    platform: str

class GameCreate(GameBase):
    pass

class GameUpdate(BaseModel):
    title: Optional[str] = None
    platform: Optional[str] = None
    status: Optional[str] = None
    cover_image: Optional[str] = None
    genres: Optional[str] = None
    metacritic_score: Optional[float] = None

class GameResponse(GameBase):
    id: int
    status: str
    rawg_id: Optional[int] = None
    cover_image: Optional[str] = None
    release_date: Optional[date] = None
    genres: Optional[str] = None
    metacritic_score: Optional[float] = None

    class Config:
        from_attributes = True 