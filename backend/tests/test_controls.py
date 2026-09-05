"""Tests for the dynamic control engine."""

import pytest

from app.services.risk_engine import RiskResult
from app.services.control_engine import evaluate_controls, ControlResult
from app.core.constants import (
    RISK_LEVEL_SAFE,
    RISK_LEVEL_WARNING,
    RISK_LEVEL_STRESS,
    RISK_LEVEL_CRISIS,
)
from app.core.risk_levels import RISK_LEVEL_CONSTRAINTS


def make_risk(
    risk_score: float,
    risk_level: str,
    volatility: float = 0.10,
    max_drawdown: float = 0.03,
    liquidity_ratio: float = 0.90,
    concentration: float = 0.25,
    market_stress: float = 0.0,
) -> RiskResult:
    return RiskResult(
        expected_return=0.08,
        volatility=volatility,
        max_drawdown=max_drawdown,
        liquidity_ratio=liquidity_ratio,
        concentration=concentration,
        market_stress=market_stress,
        risk_score=risk_score,
        risk_level=risk_level,
    )


class TestDynamicRiskLevels:
    def test_safe_constraints(self):
        risk = make_risk(20, RISK_LEVEL_SAFE)
        result = evaluate_controls(risk)
        assert result.risk_level == RISK_LEVEL_SAFE
        assert result.constraints["max_equity"] == 0.50
        assert result.constraints["min_cash"] == 0.10

    def test_warning_constraints(self):
        risk = make_risk(45, RISK_LEVEL_WARNING, volatility=0.16)
        result = evaluate_controls(risk)
        assert result.risk_level == RISK_LEVEL_WARNING
        assert result.constraints["max_equity"] == 0.45
        assert result.constraints["min_cash"] == 0.12

    def test_stress_constraints(self):
        risk = make_risk(70, RISK_LEVEL_STRESS, volatility=0.18, max_drawdown=0.12)
        result = evaluate_controls(risk)
        assert result.risk_level == RISK_LEVEL_STRESS
        assert result.constraints["max_equity"] == 0.35
        assert result.constraints["min_cash"] == 0.15

    def test_crisis_constraints(self):
        risk = make_risk(90, RISK_LEVEL_CRISIS, volatility=0.22, max_drawdown=0.15)
        result = evaluate_controls(risk)
        assert result.risk_level == RISK_LEVEL_CRISIS
        assert result.constraints["max_equity"] == 0.20
        assert result.constraints["min_cash"] == 0.20


class TestBreachDetection:
    def test_no_breaches_safe(self):
        risk = make_risk(20, RISK_LEVEL_SAFE)
        result = evaluate_controls(risk)
        assert len(result.breaches) == 0

    def test_volatility_breach(self):
        risk = make_risk(45, RISK_LEVEL_WARNING, volatility=0.18)
        result = evaluate_controls(risk)
        assert any("volatility" in b.lower() for b in result.breaches)

    def test_drawdown_breach(self):
        risk = make_risk(70, RISK_LEVEL_STRESS, max_drawdown=0.12)
        result = evaluate_controls(risk)
        assert any("drawdown" in b.lower() for b in result.breaches)

    def test_liquidity_breach(self):
        risk = make_risk(70, RISK_LEVEL_STRESS, liquidity_ratio=0.15)
        result = evaluate_controls(risk)
        assert any("liquidity" in b.lower() for b in result.breaches)

    def test_multiple_breaches(self):
        risk = make_risk(
            90, RISK_LEVEL_CRISIS,
            volatility=0.22,
            max_drawdown=0.15,
            liquidity_ratio=0.15,
        )
        result = evaluate_controls(risk)
        assert len(result.breaches) >= 3


class TestConstraintValues:
    def test_all_levels_defined(self):
        for level in [RISK_LEVEL_SAFE, RISK_LEVEL_WARNING, RISK_LEVEL_STRESS, RISK_LEVEL_CRISIS]:
            assert level in RISK_LEVEL_CONSTRAINTS
            c = RISK_LEVEL_CONSTRAINTS[level]
            assert "max_equity" in c
            assert "min_cash" in c
            assert "max_volatility" in c
            assert "max_drawdown" in c

    def test_constraints_tighten_with_risk(self):
        """Higher risk levels should have tighter constraints."""
        levels = [RISK_LEVEL_SAFE, RISK_LEVEL_WARNING, RISK_LEVEL_STRESS, RISK_LEVEL_CRISIS]
        for i in range(len(levels) - 1):
            current = RISK_LEVEL_CONSTRAINTS[levels[i]]
            next_level = RISK_LEVEL_CONSTRAINTS[levels[i + 1]]
            assert next_level["max_equity"] <= current["max_equity"]
            assert next_level["min_cash"] >= current["min_cash"]
            assert next_level["max_volatility"] <= current["max_volatility"]
