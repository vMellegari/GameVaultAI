from pydantic import BaseModel
from typing import Optional


class RawgGame(BaseModel):
    """Representa um jogo resumido utilizado no (/games/search) endpoint da RAWG."""
    rawg_id: int
    title: str
    cover_image: Optional[str] = None
    released: Optional[str] = None

class RawgGameDetails(BaseModel):
    """Detalhes completos de um jogo."""
    rawg_id: int
    title: str
    platform: str
    cover_image: Optional[str] = None
    released: Optional[str] = None
    description: Optional[str] = None
    genres: Optional[str] = None
    metacritic_score: Optional[float] = None