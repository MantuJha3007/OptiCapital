"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = (
        "postgresql+psycopg://capital_user:capital_password@localhost:5433/smart_capital"
    )
    cors_origins: str = "http://localhost:5173"
    risk_aversion: float = 1.0
    transaction_cost_rate: float = 0.001

    # Preference for leaving the book alone, as a fraction of portfolio value
    # per unit of turnover. Real transaction cost (0.1%) is far too small to
    # express minimum necessary intervention on its own, so the policy is
    # stated explicitly here and can be tuned without touching the solver.
    #
    # It is deliberately set above the risk reduction available from fully
    # de-risking (variance of a stressed book is around 0.06). Below that,
    # the objective keeps trading past the point where the portfolio is
    # already inside its limits; above it, the hard constraints decide how far
    # to go and the solver stops there. That is what makes the result the
    # SMALLEST trade restoring safety rather than the lowest-risk book.
    intervention_penalty: float = 0.15


settings = Settings()
