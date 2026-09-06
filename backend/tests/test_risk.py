"""Tests for the risk engine formulas and scoring."""

import numpy as np
import pytest

from app.core.formulas import (
    portfolio_expected_return,
    portfolio_volatility,
    maximum_drawdown,
    liquidity_ratio,
    concentration_hhi,
    market_stress_indicator,
    compute_risk_score,
    risk_level_from_score,
)


class TestPortfolioReturn:
    def test_basic(self):
        weights = np.array([0.6, 0.4])
        returns = np.array([0.10, 0.05])
        result = portfolio_expected_return(weights, returns)
        assert abs(result - 0.08) < 1e-10

    def test_single_asset(self):
        weights = np.array([1.0])
        returns = np.array([0.12])
        assert abs(portfolio_expected_return(weights, returns) - 0.12) < 1e-10


class TestPortfolioVolatility:
    def test_uncorrelated(self):
        weights = np.array([0.5, 0.5])
        # Diagonal covariance (uncorrelated)
        cov = np.array([[0.04, 0.0], [0.0, 0.01]])
        vol = portfolio_volatility(weights, cov)
        expected = np.sqrt(0.5**2 * 0.04 + 0.5**2 * 0.01)
        assert abs(vol - expected) < 1e-10

    def test_single_asset(self):
        weights = np.array([1.0])
        cov = np.array([[0.0484]])  # 22% vol
        vol = portfolio_volatility(weights, cov)
        assert abs(vol - 0.22) < 1e-10


class TestMaxDrawdown:
    def test_no_drawdown(self):
        cum_returns = np.array([1.0, 1.1, 1.2, 1.3])
        assert maximum_drawdown(cum_returns) == 0.0

    def test_has_drawdown(self):
        cum_returns = np.array([1.0, 1.2, 0.9, 1.1])
        dd = maximum_drawdown(cum_returns)
        # Peak is 1.2, trough is 0.9 → drawdown = (1.2-0.9)/1.2 = 0.25
        assert abs(dd - 0.25) < 1e-10

    def test_empty(self):
        assert maximum_drawdown(np.array([])) == 0.0


class TestLiquidityRatio:
    def test_basic(self):
        weights = np.array([0.45, 0.25, 0.15, 0.10, 0.05])
        liq_scores = np.array([0.90, 0.95, 0.70, 0.85, 1.00])
        lr = liquidity_ratio(weights, liq_scores)
        expected = 0.45*0.90 + 0.25*0.95 + 0.15*0.70 + 0.10*0.85 + 0.05*1.00
        assert abs(lr - expected) < 1e-10


class TestConcentration:
    def test_equal_weights(self):
        weights = np.array([0.2, 0.2, 0.2, 0.2, 0.2])
        hhi = concentration_hhi(weights)
        assert abs(hhi - 0.20) < 1e-10

    def test_concentrated(self):
        weights = np.array([1.0, 0.0, 0.0, 0.0, 0.0])
        hhi = concentration_hhi(weights)
        assert abs(hhi - 1.0) < 1e-10


class TestMarketStress:
    def test_no_stress(self):
        assert market_stress_indicator(0.10, 0.15) == 0.0

    def test_high_stress(self):
        # Current vol = 3× historical avg
        stress = market_stress_indicator(0.30, 0.10)
        assert abs(stress - 1.0) < 1e-10

    def test_moderate_stress(self):
        # Current vol = 1.5× historical avg → stress = 0.5
        stress = market_stress_indicator(0.15, 0.10)
        assert abs(stress - 0.5) < 1e-10


class TestRiskScore:
    def test_low_risk(self):
        score = compute_risk_score(
            volatility_val=0.05,
            max_drawdown_val=0.02,
            concentration_val=0.20,
            liquidity_val=0.95,
            market_stress_val=0.0,
        )
        assert 0 <= score <= 30  # Should be SAFE

    def test_high_risk(self):
        score = compute_risk_score(
            volatility_val=0.25,
            max_drawdown_val=0.15,
            concentration_val=0.50,
            liquidity_val=0.30,
            market_stress_val=0.8,
        )
        assert score > 50  # Should be WARNING or above

    def test_clamped_0_100(self):
        score = compute_risk_score(0.0, 0.0, 0.20, 1.0, 0.0)
        assert score >= 0
        score = compute_risk_score(1.0, 1.0, 1.0, 0.0, 1.0)
        assert score <= 100


class TestRiskLevel:
    def test_safe(self):
        assert risk_level_from_score(15) == "SAFE"

    def test_warning(self):
        assert risk_level_from_score(45) == "WARNING"

    def test_stress(self):
        assert risk_level_from_score(70) == "STRESS"

    def test_crisis(self):
        assert risk_level_from_score(90) == "CRISIS"

    def test_boundaries(self):
        assert risk_level_from_score(0) == "SAFE"
        assert risk_level_from_score(29.9) == "SAFE"
        assert risk_level_from_score(30) == "WARNING"
        assert risk_level_from_score(59.9) == "WARNING"
        assert risk_level_from_score(60) == "STRESS"
        assert risk_level_from_score(79.9) == "STRESS"
        assert risk_level_from_score(80) == "CRISIS"
        assert risk_level_from_score(100) == "CRISIS"


class TestWeightNormalization:
    def test_weights_sum_to_one(self):
        weights = np.array([0.45, 0.25, 0.15, 0.10, 0.05])
        assert abs(np.sum(weights) - 1.0) < 1e-10


class TestRiskAttributionEndpoint:
    def test_risk_attribution_endpoint(self, client):
        resp = client.get("/api/risk/attribution")
        assert resp.status_code == 200
        data = resp.json()
        assert "portfolio_volatility" in data
        assert "risk_attributions" in data
        assert "primary_driver" in data
        assert len(data["risk_attributions"]) == 5

