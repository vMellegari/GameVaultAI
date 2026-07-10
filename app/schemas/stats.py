from pydantic import BaseModel

class GameStats(BaseModel):
    total_games: int
    backlog: int
    playing: int
    completed: int
    dropped: int
    wishlist: int
    favorite_games: int
    total_hours: float
    average_rating: float | None