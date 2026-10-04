import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://gamevault:gamevault@localhost:5432/gamevault"
    )

    RAWG_API_KEY = os.getenv(
        "RAWG_API_KEY",
        ""
    )

    GEMINI_API_KEY = os.getenv(
        "GEMINI_API_KEY",
        ""
    )

    MEDIA_DIR = os.getenv("GAMEVAULT_MEDIA_DIR", "data/media")

    STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").lower()
    if STORAGE_BACKEND not in {"local", "supabase"}:
        raise RuntimeError("STORAGE_BACKEND deve ser 'local' ou 'supabase'.")
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_STORAGE_BUCKET = os.getenv(
        "SUPABASE_STORAGE_BUCKET", "game-session-images"
    )

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173",
        ).split(",")
        if origin.strip()
    ]

    SECRET_KEY = os.getenv("SECRET_KEY")

    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY não configurada.")

    ALGORITHM = os.getenv(
        "ALGORITHM",
        "HS256"
    )

    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv(
            "ACCESS_TOKEN_EXPIRE_MINUTES",
            "1440"
        )
    )


settings = Settings()
