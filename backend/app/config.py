"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = (
        "postgresql+psycopg://capital_user:capital_password@localhost:5432/smart_capital"
    )
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173"
    risk_aversion: float = 1.0
    transaction_cost_rate: float = 0.001
    intervention_penalty: float = 0.15

    # Groq & AI Copilot
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    ai_enabled: bool = True

    # RAG Settings
    rag_enabled: bool = True
    rag_top_k: int = 5
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 120

    # Market Data
    market_data_provider: str = "demo"


settings = Settings()
