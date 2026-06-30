from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.database import engine, Base
from app.models import game
from app.api.v1.games import router as games_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="GameVault AI",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(games_router)

@app.get("/")
def root():
    return {"message": "GameVault AI está em execução!"}