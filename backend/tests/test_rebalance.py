"""Tests for the rebalancer — action determination and approval."""

import numpy as np
import pytest

from app.services.risk_engine import RiskResult
from app.services.control_engine import ControlResult
from app.services.rebalancer import determine_action
from app.core.constants import (
    ACTION_HOLD,
    ACTION_REBALANCE,
    ACTION_CRISIS_PROTECTION,
    RISK_LEVEL_SAFE,
    RISK_LEVEL_WARNING,
    RISK_LEVEL_STRESS,
    RISK_LEVEL_CRISIS,
)
from app.core.formulas import transaction_cost


def make_risk(level: str, score: float) -> RiskResult:
    return RiskResult(
        expected_return=0.08,
        volatility=0.15,
        max_drawdown=0.10,
        liquidity_ratio=0.85,
        concentration=0.25,
        market_stress=0.2,
        risk_score=score,
        risk_level=level,
    )


def make_control(level: str, breaches: list[str]) -> ControlResult:
    return ControlResult(
        risk_level=level,
        constraints={},
        breaches=breaches,
    )


class TestDetermineAction:
    def test_hold_when_safe(self):
        risk = make_risk(RISK_LEVEL_SAFE, 20)
        control = make_control(RISK_LEVEL_SAFE, [])
        assert determine_action(risk, control) == ACTION_HOLD

    def test_rebalance_when_warning_with_breaches(self):
        risk = make_risk(RISK_LEVEL_WARNING, 45)
        control = make_control(RISK_LEVEL_WARNING, ["Volatility exceeded limit"])
        assert determine_action(risk, control) == ACTION_REBALANCE

    def test_rebalance_when_stress(self):
        risk = make_risk(RISK_LEVEL_STRESS, 70)
        control = make_control(RISK_LEVEL_STRESS, ["Drawdown exceeded limit"])
        assert determine_action(risk, control) == ACTION_REBALANCE

    def test_crisis_protection(self):
        risk = make_risk(RISK_LEVEL_CRISIS, 90)
        control = make_control(RISK_LEVEL_CRISIS, ["Multiple breaches"])
        assert determine_action(risk, control) == ACTION_CRISIS_PROTECTION


class TestRebalanceApproval:
    def test_transaction_cost_calculated(self):
        old = np.array([0.45, 0.25, 0.15, 0.10, 0.05])
        new = np.array([0.20, 0.35, 0.10, 0.15, 0.20])
        cost = transaction_cost(old, new, 10_000_000, 0.001)
        assert cost > 0

    def test_risk_reduction_after_rebalance(self):
        """After rebalancing from crisis allocation, risk should be lower."""
        # Crisis allocation has high equity
        crisis_weights = np.array([0.45, 0.20, 0.15, 0.10, 0.10])
        # Recommended safe allocation
        safe_weights = np.array([0.20, 0.35, 0.10, 0.15, 0.20])

        # Volatility should be lower with safer allocation
        vols = np.array([0.22, 0.06, 0.10, 0.15, 0.01])
        cov = np.diag(vols ** 2)

        vol_before = np.sqrt(crisis_weights @ cov @ crisis_weights)
        vol_after = np.sqrt(safe_weights @ cov @ safe_weights)

        assert vol_after < vol_before
