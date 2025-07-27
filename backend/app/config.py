from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "issue_tracker"
    
    # JWT
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    gemini_api_key: str = "your-gemini-api-key-here"
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"


settings = Settings()
