"""Market data service — loads historical prices and computes statistics."""

from uuid import UUID

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.models.market_data import MarketPrice
from app.models.asset import Asset
from app.core.formulas import annualize_returns, annualize_covariance
from app.core.constants import TRADING_DAYS_PER_YEAR


def get_price_dataframe(db: Session, asset_ids: list[UUID]) -> pd.DataFrame:
    """Build a DataFrame of close prices indexed by date, columns = asset_id."""
    rows = (
        db.query(MarketPrice)
        .filter(MarketPrice.asset_id.in_(asset_ids))
        .order_by(MarketPrice.price_date)
        .all()
    )

    data: dict[str, list] = {"date": [], "asset_id": [], "close": []}
    for r in rows:
        data["date"].append(r.price_date)
        data["asset_id"].append(str(r.asset_id))
        data["close"].append(r.close_price)

    if not data["date"]:
        return pd.DataFrame()

    df = pd.DataFrame(data)
    pivot = df.pivot(index="date", columns="asset_id", values="close")
    pivot.sort_index(inplace=True)
    return pivot


def compute_daily_returns(prices: pd.DataFrame) -> pd.DataFrame:
    """Compute daily percentage returns."""
    return prices.pct_change().dropna()


def compute_annualized_stats(
    prices: pd.DataFrame, asset_ids_ordered: list[str]
) -> tuple[np.ndarray, np.ndarray]:
    """Return (annualised_mean_returns, annualised_cov_matrix) for ordered asset ids."""
    daily = compute_daily_returns(prices)

    # Ensure column order matches asset_ids_ordered
    daily = daily[asset_ids_ordered]

    mean_daily = daily.mean().values
    cov_daily = daily.cov().values

    return annualize_returns(mean_daily), annualize_covariance(cov_daily)


def get_historical_volatility(prices: pd.DataFrame) -> float:
    """Average annualised volatility across all assets."""
    daily = compute_daily_returns(prices)
    daily_vols = daily.std().values
    ann_vols = daily_vols * np.sqrt(TRADING_DAYS_PER_YEAR)
    return float(np.mean(ann_vols))


def get_cumulative_portfolio_returns(
    prices: pd.DataFrame, weights: np.ndarray, asset_ids_ordered: list[str]
) -> np.ndarray:
    """Compute cumulative portfolio returns for drawdown calculation."""
    daily = compute_daily_returns(prices)
    daily = daily[asset_ids_ordered]

    portfolio_daily = daily.values @ weights
    cumulative = np.cumprod(1 + portfolio_daily)
    return cumulative
