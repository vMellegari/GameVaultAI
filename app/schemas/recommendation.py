from pydantic import BaseModel


class Recommendation(BaseModel):
    title: str
    genres: list[str]
    reason: str
    rawg_id: int | None = None
    cover_image: str | None = None


class RecommendationResponse(BaseModel):
    recommendations: list[Recommendation]
