"""Dynamic constraint tables per risk level.

The control engine uses these to determine what constraints to
pass to the CVXPY optimizer based on the current risk level.
"""

from app.core.constants import (
    RISK_LEVEL_SAFE,
    RISK_LEVEL_WARNING,
    RISK_LEVEL_STRESS,
    RISK_LEVEL_CRISIS,
)


# Each level defines maximum/minimum constraints
RISK_LEVEL_CONSTRAINTS = {
    RISK_LEVEL_SAFE: {
        "max_equity": 0.50,
        "min_cash": 0.10,
        "max_volatility": 0.15,
        "max_drawdown": 0.10,
    },
    RISK_LEVEL_WARNING: {
        "max_equity": 0.45,
        "min_cash": 0.12,
        "max_volatility": 0.14,
        "max_drawdown": 0.10,
    },
    RISK_LEVEL_STRESS: {
        "max_equity": 0.35,
        "min_cash": 0.15,
        "max_volatility": 0.12,
        "max_drawdown": 0.08,
    },
    RISK_LEVEL_CRISIS: {
        "max_equity": 0.20,
        "min_cash": 0.20,
        "max_volatility": 0.10,
        "max_drawdown": 0.05,
    },
}


# Normal-mode constraints (used as baseline thresholds for breach detection)
NORMAL_CONSTRAINTS = RISK_LEVEL_CONSTRAINTS[RISK_LEVEL_SAFE]
