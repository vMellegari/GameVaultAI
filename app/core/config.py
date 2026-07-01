import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")
    RAWG_API_KEY = os.getenv("RAWG_API_KEY")

settings = Settings()