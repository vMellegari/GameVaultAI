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
