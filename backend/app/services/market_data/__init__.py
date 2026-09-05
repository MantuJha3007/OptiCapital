"""Market Data Providers registry and factory for AEGIS."""

from typing import Literal
from app.config import settings
from app.services.market_data.base import MarketDataProvider
from app.services.market_data.demo_provider import DemoMarketDataProvider
from app.services.market_data.csv_provider import CSVMarketDataProvider
from app.services.market_data.live_provider import LiveMarketDataProvider

_PROVIDERS: dict[str, MarketDataProvider] = {
    "demo": DemoMarketDataProvider(),
    "live": LiveMarketDataProvider(),
}
_CURRENT_PROVIDER_NAME: str = settings.market_data_provider or "demo"


def get_market_data_provider() -> MarketDataProvider:
    """Return the active market data provider."""
    global _CURRENT_PROVIDER_NAME
    return _PROVIDERS.get(_CURRENT_PROVIDER_NAME, _PROVIDERS["demo"])


def set_market_data_provider(name: Literal["demo", "csv", "live"]) -> MarketDataProvider:
    """Set the active market data provider."""
    global _CURRENT_PROVIDER_NAME
    if name not in _PROVIDERS:
        raise ValueError(f"Unknown provider '{name}'. Must be demo, csv, or live.")
    _CURRENT_PROVIDER_NAME = name
    return _PROVIDERS[name]


def register_csv_provider(provider: CSVMarketDataProvider) -> None:
    """Register an uploaded CSV market provider."""
    global _CURRENT_PROVIDER_NAME
    _PROVIDERS["csv"] = provider
    _CURRENT_PROVIDER_NAME = "csv"


def get_market_data_status() -> dict:
    """Return metadata for all available providers and the active provider."""
    active = get_market_data_provider()
    return {
        "active_provider": _CURRENT_PROVIDER_NAME,
        "metadata": active.get_metadata(),
        "available_providers": list(_PROVIDERS.keys()),
    }
