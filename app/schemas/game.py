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

class GameResponse(GameBase):
    id: int
    status: str

    class Config:
        from_attributes = True 