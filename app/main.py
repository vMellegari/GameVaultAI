from fastapi import FastAPI

app = FastAPI(
    title="GameVault AI",
    description="Rastreador de biblioteca de jogos com recomendações de IA",
    version="0.1.0"
)


@app.get("/")
def root():
    return {"message": "GameVault AI está em execução!"}