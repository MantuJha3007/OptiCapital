"""Live Market Data Provider stub — for real-time / external market APIs with Demo fallback."""

from typing import Any
import pandas as pd

from app.services.market_data.base import MarketDataProvider
from app.services.market_data.demo_provider import DemoMarketDataProvider


class LiveMarketDataProvider(MarketDataProvider):
    """Live streaming or periodic API polling market provider."""

    def __init__(self, api_endpoint: str | None = None):
        self.api_endpoint = api_endpoint
        self._fallback = DemoMarketDataProvider()

    def get_prices(self, symbols: list[str] | None = None, lookback_days: int = 250) -> pd.DataFrame:
        # Fallback to deterministic demo feed in absence of paid external API key
        return self._fallback.get_prices(symbols=symbols, lookback_days=lookback_days)

    def get_returns(self, symbols: list[str] | None = None, lookback_days: int = 250) -> pd.DataFrame:
        return self._fallback.get_returns(symbols=symbols, lookback_days=lookback_days)

    def get_market_index(self, lookback_days: int = 250) -> pd.Series:
        return self._fallback.get_market_index(lookback_days=lookback_days)

    def get_volatility(self, symbols: list[str] | None = None) -> dict[str, float]:
        return self._fallback.get_volatility(symbols=symbols)

    def get_metadata(self) -> dict[str, Any]:
        return {
            "provider": "LIVE",
            "name": "Live Market Data Feed (Proxy Mode)",
            "status": "ONLINE",
            "endpoint": self.api_endpoint or "Default Fiduciary Gateway",
            "fallback_active": True,
            "asset_count": 5,
            "observations": 250,
            "offline_ready": True,
        }
