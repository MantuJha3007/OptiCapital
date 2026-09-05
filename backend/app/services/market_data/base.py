"""Base abstract class for Market Data Providers in AEGIS."""

from abc import ABC, abstractmethod
from typing import Any
import pandas as pd


class MarketDataProvider(ABC):
    """Abstract interface for all AEGIS market data feeds."""

    @abstractmethod
    def get_prices(self, symbols: list[str] | None = None, lookback_days: int = 250) -> pd.DataFrame:
        """Return a DataFrame of asset close prices indexed by date."""
        pass

    @abstractmethod
    def get_returns(self, symbols: list[str] | None = None, lookback_days: int = 250) -> pd.DataFrame:
        """Return a DataFrame of asset daily percentage returns."""
        pass

    @abstractmethod
    def get_market_index(self, lookback_days: int = 250) -> pd.Series:
        """Return a Series of benchmark index returns/prices (e.g. Nifty 50 proxy)."""
        pass

    @abstractmethod
    def get_volatility(self, symbols: list[str] | None = None) -> dict[str, float]:
        """Return annualized volatility per symbol."""
        pass

    @abstractmethod
    def get_metadata(self) -> dict[str, Any]:
        """Return provider metadata (provider name, observation count, asset count, status)."""
        pass
