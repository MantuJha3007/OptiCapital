"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = (
        "postgresql+psycopg://capital_user:capital_password@localhost:5432/smart_capital"
    )
    cors_origins: str = "http://localhost:5173"
    risk_aversion: float = 1.0
    transaction_cost_rate: float = 0.001


settings = Settings()
