from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field


class GameSessionCreate(BaseModel):
    played_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    duration_minutes: int = Field(gt=0, le=1440)
    notes: str | None = Field(default=None, max_length=2000)


class GameSessionUpdate(BaseModel):
    played_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    notes: str | None = Field(default=None, max_length=2000)


class GameSessionImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    original_filename: str
    content_type: str
    file_size: int
    created_at: datetime


class GameSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    played_at: datetime
    duration_minutes: int
    notes: str | None = None
    created_at: datetime
    images: list[GameSessionImageResponse] = Field(default_factory=list)


class GameSessionGameResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    platform: str
    cover_image: str | None = None


class RecentGameSessionResponse(GameSessionResponse):
    game: GameSessionGameResponse


class GameSessionInsightsResponse(BaseModel):
    summary: str
    highlights: list[str] = Field(default_factory=list, max_length=5)
    sessions_analyzed: int


class GameSessionInsightsContent(BaseModel):
    summary: str
    highlights: list[str] = Field(default_factory=list, max_length=5)
