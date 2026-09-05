"""Unit tests for Quant Risk Extensions (VaR 95%, CVaR 95%)."""

import pytest
from app.core.formulas import value_at_risk_95, conditional_value_at_risk_95


def test_var_cvar_basic():
    vol = 0.20  # 20% vol
    mu = 0.08   # 8% expected return

    var = value_at_risk_95(vol, mu)
    cvar = conditional_value_at_risk_95(vol, mu)

    # VaR = 1.6449 * 0.20 - 0.08 = 0.32898 - 0.08 = 0.24898 ~ 24.9%
    assert 0.24 < var < 0.26
    # CVaR is always strictly greater than VaR
    assert cvar > var
    # CVaR = 2.0627 * 0.20 - 0.08 = 0.4125 - 0.08 = 0.3325 ~ 33.3%
    assert 0.32 < cvar < 0.35


def test_var_monotonic_with_volatility():
    mu = 0.05
    var_low = value_at_risk_95(0.10, mu)
    var_high = value_at_risk_95(0.30, mu)
    assert var_high > var_low
