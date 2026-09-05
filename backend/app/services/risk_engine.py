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
    value_at_risk,
    conditional_value_at_risk,
    sharpe_ratio,
    risk_contributions,
)
from app.services.market_data_service import (
    get_price_dataframe,
    compute_annualized_stats,
    get_historical_volatility,
    get_cumulative_portfolio_returns,
)
from app.services.portfolio_service import get_holdings_data, get_asset_symbols


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
        var_95: float = 0.0,
        cvar_95: float = 0.0,
        sharpe_ratio: float = 0.0,
        regime: str = "CALM",
        risk_contributions: dict[str, float] | None = None,
        hhi_risk: float = 0.0,
        correlation_matrix: dict[str, dict[str, float]] | None = None,
    ):
        self.expected_return = expected_return
        self.volatility = volatility
        self.max_drawdown = max_drawdown
        self.liquidity_ratio = liquidity_ratio
        self.concentration = concentration
        self.market_stress = market_stress
        self.risk_score = risk_score
        self.risk_level = risk_level
        self.var_95 = var_95
        self.cvar_95 = cvar_95
        self.sharpe_ratio = sharpe_ratio
        self.regime = regime
        self.risk_contributions = risk_contributions or {}
        self.hhi_risk = hhi_risk
        self.correlation_matrix = correlation_matrix or {}



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

    # Extended Institutional Metrics
    v_95 = value_at_risk(port_vol, confidence=0.95, horizon_days=1)
    cv_95 = conditional_value_at_risk(port_vol, confidence=0.95, horizon_days=1)
    s_ratio = sharpe_ratio(port_return, port_vol)

    if stress < 0.20:
        regime = "CALM"
    elif stress < 0.60:
        regime = "TRANSITIONAL"
    else:
        regime = "CRISIS"

    symbols = get_asset_symbols(portfolio)
    rc_array = risk_contributions(weights, cov_matrix)
    rc_dict = {
        symbols[i]: float(round(rc_array[i], 4))
        for i in range(min(len(symbols), len(rc_array)))
    }
    hhi_risk_val = float(np.sum(rc_array ** 2))

    diag_std = np.sqrt(np.maximum(np.diag(cov_matrix), 1e-8))
    outer_std = np.outer(diag_std, diag_std)
    corr_mat = np.divide(cov_matrix, outer_std, out=np.eye(len(diag_std)), where=outer_std != 0)
    corr_dict = {
        s1: {s2: float(round(corr_mat[i, j], 3)) for j, s2 in enumerate(symbols) if j < len(corr_mat)}
        for i, s1 in enumerate(symbols) if i < len(corr_mat)
    }

    return RiskResult(
        expected_return=port_return,
        volatility=port_vol,
        max_drawdown=max_dd,
        liquidity_ratio=liq,
        concentration=conc,
        market_stress=stress,
        risk_score=score,
        risk_level=level,
        var_95=v_95,
        cvar_95=cv_95,
        sharpe_ratio=s_ratio,
        regime=regime,
        risk_contributions=rc_dict,
        hhi_risk=hhi_risk_val,
        correlation_matrix=corr_dict,
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
