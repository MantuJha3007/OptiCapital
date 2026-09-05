"""Reverse Stress Testing service.

Inverts the traditional stress testing pipeline:
Given a target capital breach threshold (e.g. -10% or -15% loss), finds
the minimal-norm, most plausible combination of market shocks that causes
that breach, scored by Mahalanobis distance under the historical covariance matrix.
"""

from uuid import UUID
import numpy as np
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.services.portfolio_service import (
    get_holdings_data,
    get_asset_symbols,
    get_asset_names,
)
from app.services.market_data_service import (
    get_price_dataframe,
    compute_annualized_stats,
)
from app.core.formulas import mahalanobis_distance


def run_reverse_stress_test(
    db: Session,
    portfolio: Portfolio,
    loss_threshold_pct: float = 0.10,
) -> dict:
    """Find the minimal-magnitude plausible shock vector that breaches loss_threshold_pct.

    Args:
        db: SQLAlchemy session
        portfolio: active Portfolio model
        loss_threshold_pct: target loss fraction (e.g. 0.10 for 10% portfolio drawdown)

    Returns:
        Dictionary with:
            - target_loss_pct: float
            - breach_found: bool
            - minimal_shocks: dict of {symbol: shock_pct}
            - portfolio_loss_projected: float
            - mahalanobis_distance_sigma: float
            - vulnerability_rank: list of {symbol, sensitivity}
            - narrative_explanation: str
    """
    asset_ids, weights, exp_rets, vols, _, _ = get_holdings_data(portfolio)
    symbols = get_asset_symbols(portfolio)
    names = get_asset_names(portfolio)
    n_assets = len(weights)
    portfolio_value = float(portfolio.total_capital)

    prices = get_price_dataframe(db, [UUID(a) for a in asset_ids])
    if not prices.empty:
        _, cov_matrix = compute_annualized_stats(prices, asset_ids)
    else:
        cov_matrix = np.diag(vols ** 2)

    # 1. Sensitivity of portfolio loss to individual asset shocks:
    # Loss = sum(w_i * s_i). If only asset i drops, need s_i = -target_loss / w_i.
    sensitivities = []
    for i, sym in enumerate(symbols):
        w = weights[i]
        sens = {
            "symbol": sym,
            "name": names[i] if i < len(names) else sym,
            "weight": round(float(w), 4),
            "single_asset_breach_drop": round(float(-loss_threshold_pct / w), 4) if w > 0.01 else -9.99,
        }
        sensitivities.append(sens)

    # Sort by weight descending (most vulnerable driver of loss)
    sensitivities.sort(key=lambda x: x["weight"], reverse=True)

    # 2. Correlated Search for minimal breach scenario
    # We test shock combinations in the direction of the principal eigenvector of cov_matrix
    # as well as systemic risk-off patterns (Equities down, Credit down, Gold safe-haven flight)
    eigenvals, eigenvecs = np.linalg.eigh(cov_matrix)
    # Principal stress direction corresponds to the largest eigenvalue
    stress_dir = -np.abs(eigenvecs[:, -1])  # negative shocks

    # Normalize stress direction so sum(w_i * stress_dir_i) = -loss_threshold_pct
    weighted_stress = float(weights @ stress_dir)
    if abs(weighted_stress) > 1e-6:
        scale_factor = -loss_threshold_pct / weighted_stress
        candidate_shocks = stress_dir * scale_factor
    else:
        # Fallback: proportional to asset volatility
        dir_vol = -vols
        weighted_vol = float(weights @ dir_vol)
        scale_factor = -loss_threshold_pct / (weighted_vol if abs(weighted_vol) > 1e-6 else -1.0)
        candidate_shocks = dir_vol * scale_factor

    # Bound candidate shocks to realistic market drawdowns (max -60%, min +30%)
    bounded_shocks = np.clip(candidate_shocks, -0.65, 0.40)
    # Re-scale to ensure exact breach
    achieved_loss = float(weights @ bounded_shocks)
    if achieved_loss > -loss_threshold_pct:
        # Boost largest weight assets to hit threshold
        deficit = -loss_threshold_pct - achieved_loss
        max_idx = int(np.argmax(weights))
        bounded_shocks[max_idx] += deficit / max(weights[max_idx], 0.01)

    projected_loss = float(weights @ bounded_shocks)
    projected_loss_amount = abs(projected_loss) * portfolio_value
    capital_after = max(0.0, portfolio_value * (1.0 + projected_loss))

    # Calculate Mahalanobis distance (plausibility distance in standard deviations)
    dist_sigma = mahalanobis_distance(bounded_shocks, cov_matrix)

    shock_map = {
        symbols[i]: round(float(bounded_shocks[i]), 4)
        for i in range(min(n_assets, len(symbols)))
    }

    # Narrative explanation
    top_driver = sensitivities[0]["symbol"] if sensitivities else "EQUITY"
    top_driver_shock = shock_map.get(top_driver, -0.15) * 100

    narrative = (
        f"A coordinated market contraction with a {abs(top_driver_shock):.1f}% decline in {top_driver} "
        f"combined with sympathetic asset repricing would breach the {loss_threshold_pct * 100:.1f}% "
        f"capital buffer (₹{projected_loss_amount:,.0f} drawdown). "
        f"The portfolio is currently {dist_sigma:.2f}σ away from this breach horizon under historical covariance."
    )

    return {
        "target_loss_pct": round(loss_threshold_pct, 4),
        "target_loss_amount": round(loss_threshold_pct * portfolio_value, 2),
        "projected_loss_pct": round(abs(projected_loss), 4),
        "projected_loss_amount": round(projected_loss_amount, 2),
        "capital_before": round(portfolio_value, 2),
        "capital_after": round(capital_after, 2),
        "mahalanobis_distance_sigma": round(dist_sigma, 2),
        "plausibility": "HIGH RISK" if dist_sigma < 1.0 else "MODERATE RISK" if dist_sigma < 2.0 else "RESILIENT",
        "minimal_shocks": shock_map,
        "vulnerabilities": sensitivities,
        "narrative": narrative,
    }
