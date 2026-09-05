"""Control engine — maps risk levels to dynamic constraints and detects breaches."""

from app.core.constants import (
    RISK_LEVEL_SAFE,
    RISK_LEVEL_WARNING,
    RISK_LEVEL_STRESS,
    RISK_LEVEL_CRISIS,
)
from app.core.risk_levels import RISK_LEVEL_CONSTRAINTS, NORMAL_CONSTRAINTS
from app.services.risk_engine import RiskResult


class ControlResult:
    """Result of the control engine evaluation."""

    def __init__(
        self,
        risk_level: str,
        constraints: dict,
        breaches: list[str],
    ):
        self.risk_level = risk_level
        self.constraints = constraints
        self.breaches = breaches


def evaluate_controls(risk: RiskResult) -> ControlResult:
    """Determine risk level, get constraints, and detect breaches.

    Breaches are detected against NORMAL (SAFE) thresholds —
    the constraints that *should* hold in healthy conditions.
    """
    level = risk.risk_level
    constraints = RISK_LEVEL_CONSTRAINTS.get(level, NORMAL_CONSTRAINTS)

    breaches: list[str] = []

    # Check against normal thresholds
    if risk.volatility > NORMAL_CONSTRAINTS["max_volatility"]:
        breaches.append(
            f"Portfolio volatility ({risk.volatility:.1%}) exceeded "
            f"configured limit ({NORMAL_CONSTRAINTS['max_volatility']:.0%})."
        )

    if risk.max_drawdown > NORMAL_CONSTRAINTS["max_drawdown"]:
        breaches.append(
            f"Maximum drawdown ({risk.max_drawdown:.1%}) exceeded "
            f"configured limit ({NORMAL_CONSTRAINTS['max_drawdown']:.0%})."
        )

    if risk.liquidity_ratio < 0.20:
        breaches.append(
            f"Liquidity ratio ({risk.liquidity_ratio:.1%}) fell below minimum (20%)."
        )

    if risk.concentration > 0.30:
        breaches.append(
            f"Portfolio concentration (HHI={risk.concentration:.3f}) is elevated."
        )

    if risk.market_stress > 0.5:
        breaches.append(
            f"Market stress indicator ({risk.market_stress:.2f}) is elevated."
        )

    return ControlResult(
        risk_level=level,
        constraints=constraints,
        breaches=breaches,
    )
