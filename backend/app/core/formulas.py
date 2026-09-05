"""Financial formulas used across the risk engine and optimizer."""

import numpy as np

from app.core.constants import (
    TRADING_DAYS_PER_YEAR,
    RISK_WEIGHT_VOLATILITY,
    RISK_WEIGHT_DRAWDOWN,
    RISK_WEIGHT_CONCENTRATION,
    RISK_WEIGHT_LIQUIDITY,
    RISK_WEIGHT_MARKET_STRESS,
    RISK_LEVEL_SAFE,
    RISK_LEVEL_WARNING,
    RISK_LEVEL_STRESS,
    RISK_LEVEL_CRISIS,
)


def portfolio_expected_return(weights: np.ndarray, expected_returns: np.ndarray) -> float:
    """wᵀμ — weighted expected return."""
    return float(weights @ expected_returns)


def portfolio_volatility(weights: np.ndarray, cov_matrix: np.ndarray) -> float:
    """√(wᵀΣw) — annualised portfolio standard deviation."""
    variance = weights @ cov_matrix @ weights
    return float(np.sqrt(variance))


def maximum_drawdown(cumulative_returns: np.ndarray) -> float:
    """Maximum peak-to-trough decline."""
    if len(cumulative_returns) == 0:
        return 0.0
    peak = np.maximum.accumulate(cumulative_returns)
    drawdowns = (peak - cumulative_returns) / np.where(peak > 0, peak, 1.0)
    return float(np.max(drawdowns))


def liquidity_ratio(weights: np.ndarray, liquidity_scores: np.ndarray) -> float:
    """Weighted average liquidity score."""
    return float(weights @ liquidity_scores)


def concentration_hhi(weights: np.ndarray) -> float:
    """Herfindahl-Hirschman Index — sum of squared weights."""
    return float(np.sum(weights ** 2))


def market_stress_indicator(
    current_vol: float,
    historical_avg_vol: float,
) -> float:
    """Simple stress indicator: how far current vol is above historical avg.

    Returns a value in [0, 1] range.
    """
    if historical_avg_vol <= 0:
        return 0.0
    ratio = current_vol / historical_avg_vol
    # Clamp to [0, 1]: ratio of 2× = stress of 1.0
    return float(min(max((ratio - 1.0), 0.0), 1.0))


def compute_risk_score(
    volatility_val: float,
    max_drawdown_val: float,
    concentration_val: float,
    liquidity_val: float,
    market_stress_val: float,
) -> float:
    """Compute risk score 0-100 from normalised component scores.

    Each component is normalised to 0-100 before weighting:
    - Volatility: 0% → 0, 30%+ → 100
    - Drawdown: 0% → 0, 20%+ → 100
    - Concentration (HHI): 0.2 (perfectly diversified 5 assets) → 0, 1.0 → 100
    - Liquidity: 1.0 → 0, 0.0 → 100  (inverse — higher liquidity is safer)
    - Market stress: 0 → 0, 1 → 100
    """
    vol_score = min(volatility_val / 0.30, 1.0) * 100
    dd_score = min(max_drawdown_val / 0.20, 1.0) * 100
    # HHI for 5 equal-weight assets = 0.20; for single asset = 1.0
    conc_score = min((concentration_val - 0.20) / 0.80, 1.0) * 100
    conc_score = max(conc_score, 0.0)
    liq_score = (1.0 - liquidity_val) * 100
    stress_score = market_stress_val * 100

    score = (
        RISK_WEIGHT_VOLATILITY * vol_score
        + RISK_WEIGHT_DRAWDOWN * dd_score
        + RISK_WEIGHT_CONCENTRATION * conc_score
        + RISK_WEIGHT_LIQUIDITY * liq_score
        + RISK_WEIGHT_MARKET_STRESS * stress_score
    )

    return float(min(max(score, 0.0), 100.0))


def risk_level_from_score(score: float) -> str:
    """Map risk score to risk level string."""
    if score < 30:
        return RISK_LEVEL_SAFE
    elif score < 60:
        return RISK_LEVEL_WARNING
    elif score < 80:
        return RISK_LEVEL_STRESS
    else:
        return RISK_LEVEL_CRISIS


def transaction_cost(
    old_weights: np.ndarray,
    new_weights: np.ndarray,
    portfolio_value: float,
    cost_rate: float,
) -> float:
    """sum(|new_w - old_w|) × portfolio_value × cost_rate."""
    turnover = float(np.sum(np.abs(new_weights - old_weights)))
    return turnover * portfolio_value * cost_rate


def portfolio_turnover(
    old_weights: np.ndarray,
    new_weights: np.ndarray,
) -> float:
    """Total absolute weight change."""
    return float(np.sum(np.abs(new_weights - old_weights)))


def annualize_returns(daily_returns: np.ndarray) -> np.ndarray:
    """Annualise daily mean returns."""
    return daily_returns * TRADING_DAYS_PER_YEAR


def annualize_covariance(daily_cov: np.ndarray) -> np.ndarray:
    """Annualise daily covariance matrix."""
    return daily_cov * TRADING_DAYS_PER_YEAR
