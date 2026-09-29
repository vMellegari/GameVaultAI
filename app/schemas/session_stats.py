from pydantic import BaseModel


class MonthlySessionHours(BaseModel):
    month: str
    hours: float


class MostPlayedGame(BaseModel):
    game_id: int
    title: str
    minutes: int
    sessions: int


class GameSessionStats(BaseModel):
    total_sessions: int
    total_hours: float
    monthly_hours: list[MonthlySessionHours]
    most_played_games: list[MostPlayedGame]
