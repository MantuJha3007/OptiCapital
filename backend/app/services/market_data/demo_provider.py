"""Demo Market Data Provider — deterministic, offline historical market series."""

from datetime import date, timedelta
from typing import Any
import numpy as np
import pandas as pd

from app.services.market_data.base import MarketDataProvider
from app.core.constants import TRADING_DAYS_PER_YEAR

CORE_SYMBOLS = ["EQUITY", "GOV_BONDS", "CORP_BONDS", "GOLD", "CASH"]

# Deterministic asset parameters for demo offline simulation
DEMO_PARAMS = {
    "EQUITY": {"mean": 0.12, "vol": 0.22, "start_price": 100.0},
    "GOV_BONDS": {"mean": 0.07, "vol": 0.06, "start_price": 100.0},
    "CORP_BONDS": {"mean": 0.09, "vol": 0.09, "start_price": 100.0},
    "GOLD": {"mean": 0.08, "vol": 0.15, "start_price": 100.0},
    "CASH": {"mean": 0.04, "vol": 0.005, "start_price": 100.0},
}


class DemoMarketDataProvider(MarketDataProvider):
    """Generates reproducible multi-asset historical series with realistic correlation."""

    def __init__(self, seed: int = 42, n_days: int = 250):
        self.seed = seed
        self.n_days = n_days
        self._cached_prices: pd.DataFrame | None = None
        self._generate_series()

    def _generate_series(self) -> None:
        np.random.seed(self.seed)
        end_date = date.today()
        dates = [end_date - timedelta(days=self.n_days - 1 - i) for i in range(self.n_days)]

        symbols = CORE_SYMBOLS
        n_assets = len(symbols)

        # Baseline correlation matrix
        corr = np.array([
            [1.00, -0.15, 0.35, 0.05, 0.00],  # EQUITY
            [-0.15, 1.00, 0.60, 0.20, 0.00],  # GOV_BONDS
            [0.35, 0.60, 1.00, 0.15, 0.00],   # CORP_BONDS
            [0.05, 0.20, 0.15, 1.00, 0.00],   # GOLD
            [0.00, 0.00, 0.00, 0.00, 1.00],   # CASH
        ])

        # Convert to daily covariance
        vols = np.array([DEMO_PARAMS[s]["vol"] / np.sqrt(TRADING_DAYS_PER_YEAR) for s in symbols])
        means = np.array([DEMO_PARAMS[s]["mean"] / TRADING_DAYS_PER_YEAR for s in symbols])
        cov = np.diag(vols) @ corr @ np.diag(vols)

        # Cholesky decomposition for correlated draws
        L = np.linalg.cholesky(cov)
        z = np.random.normal(size=(self.n_days, n_assets))
        daily_returns = means + z @ L.T

        # Cumulative price generation
        price_dict = {}
        for idx, sym in enumerate(symbols):
            rets = daily_returns[:, idx]
            cum_prices = DEMO_PARAMS[sym]["start_price"] * np.cumprod(1 + rets)
            price_dict[sym] = cum_prices

        self._cached_prices = pd.DataFrame(price_dict, index=dates)

    def get_prices(self, symbols: list[str] | None = None, lookback_days: int = 250) -> pd.DataFrame:
        if self._cached_prices is None:
            self._generate_series()
        assert self._cached_prices is not None
        df = self._cached_prices.tail(lookback_days)
        if symbols:
            valid_cols = [s for s in symbols if s in df.columns]
            return pd.DataFrame(df[valid_cols])
        return df

    def get_returns(self, symbols: list[str] | None = None, lookback_days: int = 250) -> pd.DataFrame:
        prices = self.get_prices(symbols=symbols, lookback_days=lookback_days)
        return prices.pct_change().dropna()

    def get_market_index(self, lookback_days: int = 250) -> pd.Series:
        """Returns benchmark composite proxy (Equity 60% + Gov Bonds 40%)."""
        rets = self.get_returns(lookback_days=lookback_days)
        if "EQUITY" in rets.columns and "GOV_BONDS" in rets.columns:
            return 0.6 * rets["EQUITY"] + 0.4 * rets["GOV_BONDS"]
        return rets.iloc[:, 0]

    def get_volatility(self, symbols: list[str] | None = None) -> dict[str, float]:
        rets = self.get_returns(symbols=symbols)
        vols = rets.std() * np.sqrt(TRADING_DAYS_PER_YEAR)
        return {str(k): round(float(v), 4) for k, v in vols.items()}

    def get_metadata(self) -> dict[str, Any]:
        return {
            "provider": "DEMO",
            "name": "Deterministic Correlated Demo Feed",
            "status": "ONLINE",
            "asset_count": len(CORE_SYMBOLS),
            "observations": self.n_days,
            "symbols": CORE_SYMBOLS,
            "last_updated": str(date.today()),
            "offline_ready": True,
        }
