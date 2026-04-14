"""
Configuration from environment variables.
Pydantic Settings — fails fast at startup if required vars are missing.
"""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    GEMINI_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    TURBOPUFFER_API_KEY: str = ""
    TURBOPUFFER_NAMESPACE: str = "chronoscopes-v2"
    TURBOPUFFER_REGION: str = "aws-us-east-1"
    RATE_LIMIT_PER_MINUTE: int = 5
    CORS_ORIGINS: str = "http://localhost:5173"
    PORT: int = 8000
    EMBEDDING_QUERY_PREFIX: str = "Represent this sentence for searching relevant passages: "
    HF_TOKEN: Optional[str] = None
    USE_OPENROUTER: bool = False
    OPENROUTER_API_KEY: Optional[str] = None

    def cors_list(self) -> list[str]:
        return [s.strip() for s in self.CORS_ORIGINS.split(",")]

    def must_have_gemini(self) -> str:
        if not self.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required")
        return self.GEMINI_API_KEY

    def must_have_elevenlabs(self) -> str:
        if not self.ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY is required")
        return self.ELEVENLABS_API_KEY

    def must_have_turbopuffer(self) -> str:
        if not self.TURBOPUFFER_API_KEY:
            raise ValueError("TURBOPUFFER_API_KEY is required")
        return self.TURBOPUFFER_API_KEY


settings = Settings()
logger_getter = __import__("app.lib.logger", fromlist=[""]).get_logger