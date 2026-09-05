"""Financial formulas used across the risk engine and optimizer."""

import sys
from pathlib import Path

# Ensure 'backend' is in sys.path when formulas.py is executed or inspected directly
_backend_dir = str(Path(__file__).resolve().parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import numpy as np

try:
    from scipy.stats import norm  # type: ignore[import-untyped]
except ImportError:
    norm = None

try:
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
except ImportError:
    from .constants import (
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
    w = np.asarray(weights, dtype=float).ravel()
    cov = np.asarray(cov_matrix, dtype=float)
    variance = max(float(w @ cov @ w), 0.0)
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


def value_at_risk(volatility: float, confidence: float = 0.95, horizon_days: int = 1) -> float:
    """Parametric Gaussian VaR. For 95%, z ~ 1.6449."""
    if volatility <= 0:
        return 0.0
    if norm is not None:
        try:
            z = float(norm.ppf(confidence))
        except Exception:
            z = 1.6448536269514722
    else:
        z = 1.6448536269514722
    horizon_vol = float(volatility) * np.sqrt(max(horizon_days, 1) / TRADING_DAYS_PER_YEAR)
    return float(z * horizon_vol)


def conditional_value_at_risk(volatility: float, confidence: float = 0.95, horizon_days: int = 1) -> float:
    """Parametric Gaussian CVaR (Expected Shortfall). For 95%, factor ~ 2.063."""
    if volatility <= 0:
        return 0.0
    if norm is not None:
        try:
            z = float(norm.ppf(confidence))
            pdf_z = float(norm.pdf(z))
            cvar_factor = pdf_z / max(1.0 - confidence, 1e-6)
        except Exception:
            cvar_factor = 2.0627128
    else:
        cvar_factor = 2.0627128
    horizon_vol = float(volatility) * np.sqrt(max(horizon_days, 1) / TRADING_DAYS_PER_YEAR)
    return float(cvar_factor * horizon_vol)


def sharpe_ratio(expected_return: float, volatility: float, risk_free_rate: float = 0.065) -> float:
    """Annualized Sharpe ratio (r - r_f) / sigma."""
    if volatility <= 1e-8 or np.isnan(volatility):
        return 0.0
    return float((expected_return - risk_free_rate) / volatility)


def risk_contributions(weights: np.ndarray, cov_matrix: np.ndarray) -> np.ndarray:
    """Marginal contribution to total portfolio variance / risk:
    RC_i = w_i * (cov_matrix @ w)_i / sigma^2
    Sum of RC_i equals 1.0 (100%).
    """
    w = np.asarray(weights, dtype=float).ravel()
    cov = np.asarray(cov_matrix, dtype=float)
    if len(w) == 0 or cov.size == 0:
        return np.array([])
    total_var = float(w @ cov @ w)
    if total_var <= 1e-12:
        return np.ones_like(w) / len(w)
    mcr = cov @ w
    rc = (w * mcr) / total_var
    return rc


def mahalanobis_distance(shock_vector: np.ndarray, cov_matrix: np.ndarray) -> float:
    """Compute Mahalanobis distance of a shock vector under the asset covariance matrix:
    D_M = sqrt(s^T * cov^-1 * s).
    Smaller distance = more plausible market scenario under historical correlation structure.
    """
    s = np.asarray(shock_vector, dtype=float).ravel()
    cov = np.asarray(cov_matrix, dtype=float)
    if len(s) == 0 or cov.size == 0:
        return 0.0
    try:
        inv_cov = np.linalg.pinv(cov)
        dist_sq = float(s @ inv_cov @ s)
        return float(np.sqrt(max(dist_sq, 0.0)))
    except Exception:
        return float(np.linalg.norm(s))


if __name__ == "__main__":
    # Self-validation when executed directly
    test_w = np.array([0.4, 0.3, 0.3])
    test_cov = np.array([
        [0.04, 0.01, 0.0],
        [0.01, 0.03, 0.0],
        [0.0, 0.0, 0.02]
    ])
    vol = portfolio_volatility(test_w, test_cov)
    var = value_at_risk(vol)
    cvar = conditional_value_at_risk(vol)
    rc = risk_contributions(test_w, test_cov)
    dist = mahalanobis_distance(np.array([-0.1, -0.05, 0.02]), test_cov)

    print("[OK] app.core.formulas executed successfully without errors!")
    print(f"  - Portfolio Volatility: {vol:.4f}")
    print(f"  - 95% 1-Day VaR:        {var:.4f}")
    print(f"  - 95% 1-Day CVaR:       {cvar:.4f}")
    print(f"  - Risk Contributions:   {np.round(rc, 4).tolist()}")
    print(f"  - Mahalanobis Distance: {dist:.4f} sigma")




