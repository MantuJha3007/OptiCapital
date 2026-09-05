"""Risk Attribution Service — Euler Risk Decomposition for AEGIS.

Quantifies asset-level marginal and absolute risk contributions to answer
why the portfolio is risky and identify hidden risk concentrations.
"""

from typing import Any
import numpy as np
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.asset import Asset
from app.services.market_data_service import get_covariance_matrix


def compute_risk_attribution(
    db: Session,
    portfolio: Portfolio,
    weights_override: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Compute Euler risk attribution for all assets in the portfolio.

    Formulas:
        MCR_i = (Sigma @ w)_i / sigma_p
        ARC_i = w_i * MCR_i = w_i * (Sigma @ w)_i / sigma_p
        PRC_i = ARC_i / sigma_p = w_i * (Sigma @ w)_i / (sigma_p^2)
        Sum(ARC_i) == sigma_p
        Sum(PRC_i) == 1.0 (100%)
    """
    assets = db.query(Asset).order_by(Asset.symbol).all()
    symbols = [a.symbol for a in assets]
    cov_matrix = get_covariance_matrix(db, symbols)

    # Determine weights
    if weights_override:
        w_dict = weights_override
    else:
        w_dict = {h.asset.symbol: float(h.weight) for h in portfolio.holdings if h.asset}

    weights = np.array([w_dict.get(sym, 0.0) for sym in symbols], dtype=float)
    total_w = np.sum(weights)
    if total_w > 0:
        weights = weights / total_w
    else:
        weights = np.ones(len(symbols)) / len(symbols)

    # Portfolio Volatility
    variance = float(weights @ cov_matrix @ weights)
    sigma_p = float(np.sqrt(max(variance, 1e-8)))

    # Marginal Contribution to Risk (MCR) = (cov @ w) / sigma_p
    cov_w = cov_matrix @ weights
    mcr = cov_w / sigma_p

    # Absolute Risk Contribution (ARC) = w * MCR
    arc = weights * mcr

    # Percentage Risk Contribution (PRC) = ARC / sigma_p
    prc = arc / sigma_p

    attributions = []
    for i, asset in enumerate(assets):
        w_val = float(weights[i])
        mcr_val = float(mcr[i])
        arc_val = float(arc[i])
        prc_val = float(prc[i])

        # Flag as primary risk driver if it contributes disproportionately to risk
        is_primary = bool(prc_val > 0.35 or (prc_val > w_val + 0.15 and prc_val > 0.20))

        attributions.append({
            "symbol": asset.symbol,
            "name": asset.name,
            "weight": round(w_val, 4),
            "marginal_risk_contribution": round(mcr_val, 4),
            "absolute_risk_contribution": round(arc_val, 4),
            "percentage_risk_contribution": round(prc_val, 4),
            "percentage_risk_pct": round(prc_val * 100.0, 1),
            "is_primary_risk_driver": is_primary,
        })

    # Sort so highest risk drivers appear first
    attributions.sort(key=lambda x: x["percentage_risk_contribution"], reverse=True)

    return {
        "portfolio_volatility": round(sigma_p, 4),
        "risk_attributions": attributions,
        "primary_driver": attributions[0]["name"] if attributions else "None",
        "primary_driver_risk_pct": attributions[0]["percentage_risk_pct"] if attributions else 0.0,
    }
