"""Reverse Stress Testing Engine — Failure Boundary Analysis for AEGIS.

Implements deterministic shock sweeps across shock intensity α ∈ [0.02, 0.52]
to calculate the critical failure shock α*, Distance to Failure (DtF),
and portfolio Resilience Score (0–100).
"""

from typing import Any
import numpy as np
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.asset import Asset
from app.services.market_data_service import get_covariance_matrix
from app.services.risk_engine import calculate_risk_from_metrics
from app.core.formulas import (
    portfolio_volatility,
    concentration_hhi,
    liquidity_ratio,
    operating_envelope_from_score,
    is_intervention_required,
)


# Crisis shock profile (normalized direction)
CRISIS_SHOCK_PROFILE = {
    "EQUITY": -1.0,
    "CORP_BONDS": -0.35,
    "GOV_BONDS": -0.15,
    "GOLD": 0.40,
    "CASH": 0.0,
}


def run_reverse_stress_sweep(
    db: Session,
    portfolio: Portfolio,
    failure_threshold_score: float = 80.0,
    weights_override: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Execute deterministic shock sweep over shock intensity alpha.

    Finds the exact critical shock alpha* where Risk Score >= failure_threshold_score.
    Returns the failure boundary, distance to failure, and sweep points for charting.
    """
    assets = db.query(Asset).order_by(Asset.symbol).all()
    symbols = [a.symbol for a in assets]
    cov_matrix = get_covariance_matrix(db, symbols)
    asset_map = {a.symbol: a for a in assets}

    # Base weights
    if weights_override:
        w_dict = weights_override
    else:
        w_dict = {h.asset.symbol: float(h.weight) for h in portfolio.holdings if h.asset}

    base_weights = np.array([w_dict.get(sym, 0.0) for sym in symbols], dtype=float)
    total_w = np.sum(base_weights)
    if total_w > 0:
        base_weights = base_weights / total_w
    else:
        base_weights = np.ones(len(symbols)) / len(symbols)

    base_vol = portfolio_volatility(base_weights, cov_matrix)
    sweep_points = []
    critical_alpha: float | None = None
    failure_risk_score: float | None = None

    alphas = np.round(np.arange(0.02, 0.54, 0.02), 4)

    for alpha in alphas:
        # Scale shocks: Equity drops by alpha, etc.
        # e.g., alpha=0.30 -> Equity -30%, Corp Bonds -10.5%
        shocks = {sym: CRISIS_SHOCK_PROFILE.get(sym, 0.0) * float(alpha) for sym in symbols}

        # Calculate shocked valuations
        shocked_weights = np.array([
            base_weights[i] * max(1.0 + shocks[symbols[i]], 0.01)
            for i in range(len(symbols))
        ], dtype=float)

        total_shocked_w = float(np.sum(shocked_weights))
        loss = 1.0 - total_shocked_w  # portfolio loss
        shocked_weights = shocked_weights / max(total_shocked_w, 1e-6)

        # Compounded peak-to-trough drawdown from shock
        # baseline historical drawdown assumed ~0.08
        prior_dd = 0.08
        stressed_dd = float(1.0 - (1.0 - prior_dd) * max(1.0 - loss, 0.01))

        # Stressed volatility with shock scaling
        vol_scaler = 1.0 + 3.0 * loss
        # Equity volatility component increases faster
        stressed_cov = cov_matrix.copy()
        if "EQUITY" in symbols:
            eq_idx = symbols.index("EQUITY")
            stressed_cov[eq_idx, :] *= vol_scaler
            stressed_cov[:, eq_idx] *= vol_scaler
            stressed_cov[eq_idx, eq_idx] = cov_matrix[eq_idx, eq_idx] * (vol_scaler ** 2)

        stressed_vol = float(np.sqrt(max(float(shocked_weights @ stressed_cov @ shocked_weights), 1e-8)))

        # Liquidity score under stress
        liq_scores = [float(asset_map[sym].liquidity_score or 0.8) for sym in symbols]
        stressed_liq_scores = []
        for i, sym in enumerate(symbols):
            base_l = liq_scores[i]
            if sym in ("EQUITY", "CORP_BONDS"):
                stressed_liq_scores.append(base_l * max(1.0 - 0.7 * float(alpha), 0.2))
            else:
                stressed_liq_scores.append(base_l)
        stressed_liq = float(np.sum(shocked_weights * np.array(stressed_liq_scores)))

        # Risk-weighted concentration
        marginal_risk = (stressed_cov @ shocked_weights) / max(stressed_vol, 1e-6)
        risk_contributions = shocked_weights * marginal_risk / max(stressed_vol, 1e-6)
        stressed_hhi = float(np.sum(np.maximum(risk_contributions, 0.0) ** 2))

        # Market stress indicator
        stress_indicator = min(float(alpha * 2.5), 1.0)

        # Calculate composite score
        risk_res = calculate_risk_from_metrics(
            expected_return=0.08,
            volatility=stressed_vol,
            max_drawdown=stressed_dd,
            liquidity=stressed_liq,
            concentration=stressed_hhi,
            stress=stress_indicator,
        )

        score = round(risk_res.risk_score, 1)
        sweep_points.append({
            "alpha": round(float(alpha), 3),
            "alpha_pct": f"{round(float(alpha) * 100, 1)}%",
            "score": score,
            "loss_pct": round(loss * 100, 1),
            "envelope": risk_res.operating_envelope,
        })

        if critical_alpha is None and score >= failure_threshold_score:
            critical_alpha = round(float(alpha), 3)
            failure_risk_score = score

    # Distance to Failure calculation
    if critical_alpha is not None:
        dtf = critical_alpha
        status = "VULNERABLE" if dtf < 0.25 else "MODERATE" if dtf < 0.45 else "RESILIENT"
    else:
        dtf = 0.52
        status = "RESILIENT"
        failure_risk_score = sweep_points[-1]["score"] if sweep_points else 75.0

    # Resilience Score: normalized against 0.50 shock ceiling
    resilience_score = round(min(dtf / 0.50, 1.0) * 100.0, 1)

    # Build the per-asset critical shock vector at the failure point
    critical_alpha_val = critical_alpha if critical_alpha is not None else 0.52
    critical_shock_vector = {}
    for sym in symbols:
        shock_pct = CRISIS_SHOCK_PROFILE.get(sym, 0.0) * critical_alpha_val
        critical_shock_vector[sym] = {
            "shock_pct": round(shock_pct * 100, 1),
            "direction": "loss" if shock_pct < 0 else "gain" if shock_pct > 0 else "neutral",
            "label": f"{'+' if shock_pct > 0 else ''}{round(shock_pct * 100, 1)}%",
        }

    return {
        "status": status,
        "distance_to_failure": dtf,
        "distance_to_failure_pct": f"{round(dtf * 100, 1)}%",
        "critical_shock_multiplier": critical_alpha_val,
        "failure_risk_score": failure_risk_score,
        "failure_threshold": failure_threshold_score,
        "resilience_score": resilience_score,
        "critical_shock_vector": critical_shock_vector,
        "sweep_points": sweep_points,
    }

