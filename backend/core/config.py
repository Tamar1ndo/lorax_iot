# backend/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME = "Decarbonator API"
    VERSION = "1.0.0"

    DROPBOX_TOKEN = os.getenv("DROPBOX_TOKEN")
    WISE4051_FOLDER = os.getenv("WISE4051_FOLDER")
    WISE4012_FOLDER = os.getenv("WISE4012_FOLDER")

    MONGODB_URL = os.getenv("MONGODB_URL")
    DATABASE_NAME = os.getenv("DATABASE_NAME")

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

settings = Settings()