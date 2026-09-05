"""Risk engine — calculates all risk metrics and persists snapshots."""

import uuid
from uuid import UUID

import numpy as np
from sqlalchemy.orm import Session

from app.models.risk_snapshot import RiskSnapshot
from app.models.portfolio import Portfolio
from app.core.formulas import (
    portfolio_expected_return,
    portfolio_volatility,
    maximum_drawdown,
    liquidity_ratio,
    concentration_hhi,
    market_stress_indicator,
    compute_risk_score,
    risk_level_from_score,
)
from app.services.market_data_service import (
    get_price_dataframe,
    compute_annualized_stats,
    get_historical_volatility,
    get_cumulative_portfolio_returns,
)
from app.services.portfolio_service import get_holdings_data


class RiskResult:
    """Container for a risk engine calculation."""

    def __init__(
        self,
        expected_return: float,
        volatility: float,
        max_drawdown: float,
        liquidity_ratio: float,
        concentration: float,
        market_stress: float,
        risk_score: float,
        risk_level: str,
    ):
        self.expected_return = expected_return
        self.volatility = volatility
        self.max_drawdown = max_drawdown
        self.liquidity_ratio = liquidity_ratio
        self.concentration = concentration
        self.market_stress = market_stress
        self.risk_score = risk_score
        self.risk_level = risk_level


def calculate_risk(
    db: Session,
    portfolio: Portfolio,
    weights_override: np.ndarray | None = None,
    cov_matrix: np.ndarray | None = None,
    mean_returns: np.ndarray | None = None,
) -> RiskResult:
    """Run the full risk engine calculation.

    If weights_override / cov_matrix / mean_returns are provided, they are
    used instead of being loaded from the database (useful for post-shock
    scenario calculations).
    """
    asset_ids, weights, exp_rets, vols, liq_scores, _ = get_holdings_data(portfolio)

    if weights_override is not None:
        weights = weights_override

    # Load market data and compute statistics
    prices = get_price_dataframe(db, [UUID(a) for a in asset_ids])

    if cov_matrix is None or mean_returns is None:
        if prices.empty:
            # Fallback: construct diagonal covariance from asset volatilities
            mean_returns = exp_rets
            cov_matrix = np.diag(vols ** 2)
        else:
            mean_returns, cov_matrix = compute_annualized_stats(prices, asset_ids)

    # Core metrics
    port_return = portfolio_expected_return(weights, mean_returns)
    port_vol = portfolio_volatility(weights, cov_matrix)

    # Drawdown from historical data
    if not prices.empty:
        cum_rets = get_cumulative_portfolio_returns(prices, weights, asset_ids)
        max_dd = maximum_drawdown(cum_rets)
    else:
        max_dd = 0.0

    liq = liquidity_ratio(weights, liq_scores)
    conc = concentration_hhi(weights)

    # Market stress
    if not prices.empty:
        hist_vol = get_historical_volatility(prices)
    else:
        hist_vol = float(np.mean(vols))
    stress = market_stress_indicator(port_vol, hist_vol)

    # Risk score
    score = compute_risk_score(port_vol, max_dd, conc, liq, stress)
    level = risk_level_from_score(score)

    return RiskResult(
        expected_return=port_return,
        volatility=port_vol,
        max_drawdown=max_dd,
        liquidity_ratio=liq,
        concentration=conc,
        market_stress=stress,
        risk_score=score,
        risk_level=level,
    )


def save_risk_snapshot(
    db: Session, portfolio_id: UUID, result: RiskResult
) -> RiskSnapshot:
    """Persist a risk result as a snapshot in PostgreSQL."""
    snapshot = RiskSnapshot(
        id=uuid.uuid4(),
        portfolio_id=portfolio_id,
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        expected_return=result.expected_return,
        volatility=result.volatility,
        max_drawdown=result.max_drawdown,
        liquidity_ratio=result.liquidity_ratio,
        concentration=result.concentration,
        market_stress=result.market_stress,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot
