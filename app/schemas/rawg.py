from pydantic import BaseModel
from typing import Optional


class RawgGame(BaseModel):
    rawg_id: int
    title: str
    cover_image: Optional[str] = None
    released: Optional[str] = None