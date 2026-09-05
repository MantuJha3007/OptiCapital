"""Explanation service — generates human-readable explanations for optimizations."""

import numpy as np

from app.models.asset import Asset
from app.services.risk_engine import RiskResult
from app.services.control_engine import ControlResult


def generate_explanation(
    risk_before: RiskResult,
    risk_after: RiskResult,
    control: ControlResult,
    assets: list[Asset],
    old_weights: np.ndarray,
    new_weights: np.ndarray,
) -> str:
    """Generate a human-readable explanation of the optimization decision."""
    lines: list[str] = []

    # Why the portfolio is risky
    lines.append(
        f"Portfolio risk level: {risk_after.risk_level} "
        f"(score: {risk_after.risk_score:.1f}/100)."
    )

    # Breaches
    if control.breaches:
        lines.append("")
        lines.append("Threshold breaches detected:")
        for breach in control.breaches:
            lines.append(f"  • {breach}")

    # Weight changes
    reduced = []
    increased = []
    for i, asset in enumerate(assets):
        old_w = float(old_weights[i])
        new_w = float(new_weights[i])
        diff = new_w - old_w
        if diff < -0.01:
            reduced.append(
                f"{asset.name} reduced from {old_w:.0%} to {new_w:.0%}"
            )
        elif diff > 0.01:
            increased.append(
                f"{asset.name} increased from {old_w:.0%} to {new_w:.0%}"
            )

    if reduced:
        lines.append("")
        lines.append("Assets reduced:")
        for r in reduced:
            lines.append(f"  ↓ {r}")

    if increased:
        lines.append("")
        lines.append("Assets increased:")
        for inc in increased:
            lines.append(f"  ↑ {inc}")

    # Why the recommendation is safer
    lines.append("")
    lines.append(
        f"The recommended allocation reduces portfolio volatility from "
        f"{risk_after.volatility:.1%} toward the {control.risk_level} mode limit "
        f"of {control.constraints.get('max_volatility', 0.15):.0%}, "
        f"improving overall risk-adjusted returns."
    )

    return "\n".join(lines)
