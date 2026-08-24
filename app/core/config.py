import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gamevault.db")
    RAWG_API_KEY = os.getenv("RAWG_API_KEY", "")
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-this-secret")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )

settings = Settings()