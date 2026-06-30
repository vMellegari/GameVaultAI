from pydantic import BaseModel


class GameCreate(BaseModel):
    title: str
    platform: str