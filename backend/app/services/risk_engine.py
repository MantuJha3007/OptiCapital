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
    operating_envelope_from_level,
    is_intervention_required,
    value_at_risk_95,
    conditional_value_at_risk_95,
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
        operating_envelope: str | None = None,
        intervention_required: bool | None = None,
        risk_status: str | None = None,
        var_95: float | None = None,
        cvar_95: float | None = None,
    ):
        self.expected_return = expected_return
        self.volatility = volatility
        self.max_drawdown = max_drawdown
        self.liquidity_ratio = liquidity_ratio
        self.concentration = concentration
        self.market_stress = market_stress
        self.risk_score = risk_score
        self.risk_level = risk_level
        self.operating_envelope = operating_envelope or operating_envelope_from_level(risk_level)
        self.intervention_required = (
            intervention_required
            if intervention_required is not None
            else is_intervention_required(risk_level)
        )
        self.risk_status = risk_status or risk_level
        self.var_95 = var_95 if var_95 is not None else value_at_risk_95(volatility, expected_return)
        self.cvar_95 = cvar_95 if cvar_95 is not None else conditional_value_at_risk_95(volatility, expected_return)



def calculate_risk(
    db: Session,
    portfolio: Portfolio,
    weights_override: np.ndarray | None = None,
    cov_matrix: np.ndarray | None = None,
    mean_returns: np.ndarray | None = None,
    drawdown_override: float | None = None,
    market_stress_override: float | None = None,
    liquidity_override: float | None = None,
    concentration_override: float | None = None,
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
            if mean_returns is None:
                mean_returns = exp_rets
            if cov_matrix is None:
                cov_matrix = np.diag(vols ** 2)
        else:
            calc_means, calc_cov = compute_annualized_stats(prices, asset_ids)
            if mean_returns is None:
                mean_returns = calc_means
            if cov_matrix is None:
                cov_matrix = calc_cov

    # Core metrics
    port_return = portfolio_expected_return(weights, mean_returns)
    port_vol = portfolio_volatility(weights, cov_matrix)

    # Drawdown from historical data or shock override
    if drawdown_override is not None:
        max_dd = max(drawdown_override, 0.0)
    elif not prices.empty:
        cum_rets = get_cumulative_portfolio_returns(prices, weights, asset_ids)
        max_dd = maximum_drawdown(cum_rets)
    else:
        max_dd = 0.0

    if liquidity_override is not None:
        liq = min(max(liquidity_override, 0.0), 1.0)
    else:
        liq = liquidity_ratio(weights, liq_scores)

    if concentration_override is not None:
        conc = min(max(concentration_override, 0.0), 1.0)
    else:
        conc = concentration_hhi(weights)

    # Market stress
    if market_stress_override is not None:
        stress = min(max(market_stress_override, 0.0), 1.0)
    elif not prices.empty:
        hist_vol = get_historical_volatility(prices)
        stress = market_stress_indicator(port_vol, hist_vol)
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


def calculate_risk_from_metrics(
    expected_return: float,
    volatility: float,
    max_drawdown: float,
    liquidity: float,
    concentration: float,
    stress: float,
) -> RiskResult:
    """Convenience helper to compute composite risk score and envelope from scalar metrics."""
    score = compute_risk_score(volatility, max_drawdown, concentration, liquidity, stress)
    level = risk_level_from_score(score)
    return RiskResult(
        expected_return=expected_return,
        volatility=volatility,
        max_drawdown=max_drawdown,
        liquidity_ratio=liquidity,
        concentration=concentration,
        market_stress=stress,
        risk_score=score,
        risk_level=level,
        operating_envelope=operating_envelope_from_level(level),
        intervention_required=is_intervention_required(level),
    )
