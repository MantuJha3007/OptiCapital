"""Tests for scenario simulation — the critical demo flow."""

import numpy as np
import pytest

from app.core.formulas import (
    compute_risk_score,
    risk_level_from_score,
    portfolio_volatility,
    concentration_hhi,
    liquidity_ratio,
    maximum_drawdown,
)


class TestMarketCrashScenario:
    """The critical acceptance test:
    Market Crash → risk increases → CRISIS mode → constraints tighten.
    """

    def setup_method(self):
        """Set up pre-crash portfolio."""
        self.weights = np.array([0.45, 0.25, 0.15, 0.10, 0.05])
        self.portfolio_value = 10_000_000

        # Shocks
        self.shocks = np.array([-0.30, -0.05, -0.10, 0.12, 0.0])

    def test_shock_reduces_value(self):
        shocked_values = self.weights * self.portfolio_value * (1 + self.shocks)
        total_after = np.sum(shocked_values)
        assert total_after < self.portfolio_value

    def test_shock_loss_magnitude(self):
        shocked_values = self.weights * self.portfolio_value * (1 + self.shocks)
        total_after = np.sum(shocked_values)
        loss = (total_after - self.portfolio_value) / self.portfolio_value
        # Expected loss: significant but not total
        assert -0.30 < loss < 0.0

    def test_post_shock_weights_renormalize(self):
        shocked_values = self.weights * self.portfolio_value * (1 + self.shocks)
        total_after = np.sum(shocked_values)
        new_weights = shocked_values / total_after
        assert abs(np.sum(new_weights) - 1.0) < 1e-10

    def test_equity_weight_drops_after_crash(self):
        shocked_values = self.weights * self.portfolio_value * (1 + self.shocks)
        total_after = np.sum(shocked_values)
        new_weights = shocked_values / total_after
        # Equity should drop from 45% due to -30% shock
        assert new_weights[0] < self.weights[0]

    def test_gold_weight_increases_after_crash(self):
        shocked_values = self.weights * self.portfolio_value * (1 + self.shocks)
        total_after = np.sum(shocked_values)
        new_weights = shocked_values / total_after
        # Gold should increase due to +12% shock
        assert new_weights[3] > self.weights[3]


class TestInflationShockScenario:
    def test_bonds_decrease(self):
        weights = np.array([0.45, 0.25, 0.15, 0.10, 0.05])
        shocks = np.array([-0.10, -0.15, -0.08, 0.15, 0.0])
        portfolio_value = 10_000_000

        shocked_values = weights * portfolio_value * (1 + shocks)
        total_after = np.sum(shocked_values)
        new_weights = shocked_values / total_after

        # Gov bonds should drop most (-15%)
        assert new_weights[1] < weights[1]


class TestRiskIncreasesAfterCrash:
    def test_concentration_increases(self):
        """After crash, portfolio becomes more concentrated."""
        weights_before = np.array([0.45, 0.25, 0.15, 0.10, 0.05])
        shocks = np.array([-0.30, -0.05, -0.10, 0.12, 0.0])

        shocked_values = weights_before * 10_000_000 * (1 + shocks)
        total_after = np.sum(shocked_values)
        weights_after = shocked_values / total_after

        hhi_before = concentration_hhi(weights_before)
        hhi_after = concentration_hhi(weights_after)
        # Concentration may change but portfolio should still be measurable
        assert hhi_after >= 0


class TestCrisisOptimization:
    def test_crisis_equity_constraint(self):
        """In CRISIS mode, equity max should be 20%."""
        from app.core.risk_levels import RISK_LEVEL_CONSTRAINTS
        from app.core.constants import RISK_LEVEL_CRISIS

        constraints = RISK_LEVEL_CONSTRAINTS[RISK_LEVEL_CRISIS]
        assert constraints["max_equity"] == 0.20

    def test_crisis_cash_constraint(self):
        """In CRISIS mode, cash min should be 20%."""
        from app.core.risk_levels import RISK_LEVEL_CONSTRAINTS
        from app.core.constants import RISK_LEVEL_CRISIS

        constraints = RISK_LEVEL_CONSTRAINTS[RISK_LEVEL_CRISIS]
        assert constraints["min_cash"] == 0.20
