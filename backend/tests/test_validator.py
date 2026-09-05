"""Tests for the Independent Candidate Validator."""

import numpy as np
import pytest

from app.models.asset import Asset
from app.services.validator import validate_candidate_allocation


@pytest.fixture
def mock_assets():
    symbols = ["EQUITY", "GOV_BONDS", "CORP_BONDS", "GOLD", "CASH"]
    assets = []
    for s in symbols:
        a = Asset(
            symbol=s,
            name=s.replace("_", " ").title(),
            category=s,
            expected_return=0.08,
            volatility=0.15,
            liquidity_score=0.85,
            min_weight=0.0,
            max_weight=1.0,
        )
        assets.append(a)
    return assets


@pytest.fixture
def sample_cov():
    return np.diag([0.20**2, 0.06**2, 0.10**2, 0.15**2, 0.01**2])


class TestIndependentValidator:
    def test_valid_allocation_passes(self, mock_assets, sample_cov):
        # 20% Eq, 35% Gov, 15% Corp, 10% Gold, 20% Cash
        weights = np.array([0.20, 0.35, 0.15, 0.10, 0.20])
        constraints = {"max_equity": 0.20, "min_cash": 0.20, "max_volatility": 0.15}
        
        result = validate_candidate_allocation(weights, mock_assets, sample_cov, constraints)
        assert result.status == "PASS"
        assert result.is_valid is True
        assert len(result.violations) == 0
        assert len(result.checks) == 6

    def test_budget_sum_breach_blocks(self, mock_assets, sample_cov):
        # Sum is 1.10 != 1.0
        weights = np.array([0.30, 0.35, 0.15, 0.10, 0.20])
        constraints = {"max_equity": 0.50, "min_cash": 0.05, "max_volatility": 0.15}
        
        result = validate_candidate_allocation(weights, mock_assets, sample_cov, constraints)
        assert result.status == "BLOCKED"
        assert result.is_valid is False
        assert any("Budget sum" in v for v in result.violations)

    def test_negative_weight_blocks(self, mock_assets, sample_cov):
        # Contains -0.05
        weights = np.array([-0.05, 0.40, 0.25, 0.20, 0.20])
        constraints = {"max_equity": 0.50, "min_cash": 0.05, "max_volatility": 0.15}
        
        result = validate_candidate_allocation(weights, mock_assets, sample_cov, constraints)
        assert result.status == "BLOCKED"
        assert result.is_valid is False
        assert any("Negative weight" in v for v in result.violations)

    def test_equity_cap_breach_blocks(self, mock_assets, sample_cov):
        # 30% Equity when limit is 20%
        weights = np.array([0.30, 0.30, 0.15, 0.10, 0.15])
        constraints = {"max_equity": 0.20, "min_cash": 0.10, "max_volatility": 0.15}
        
        result = validate_candidate_allocation(weights, mock_assets, sample_cov, constraints)
        assert result.status == "BLOCKED"
        assert any("Equity weight" in v for v in result.violations)

    def test_cash_floor_breach_blocks(self, mock_assets, sample_cov):
        # 10% Cash when limit is 20%
        weights = np.array([0.20, 0.40, 0.20, 0.10, 0.10])
        constraints = {"max_equity": 0.20, "min_cash": 0.20, "max_volatility": 0.15}
        
        result = validate_candidate_allocation(weights, mock_assets, sample_cov, constraints)
        assert result.status == "BLOCKED"
        assert any("Cash reserve" in v for v in result.violations)

    def test_concentration_limit_breach_blocks(self, mock_assets, sample_cov):
        # 60% in Gov Bonds (limit 50%)
        weights = np.array([0.10, 0.60, 0.10, 0.10, 0.10])
        constraints = {"max_equity": 0.50, "min_cash": 0.05, "max_volatility": 0.25}
        
        result = validate_candidate_allocation(weights, mock_assets, sample_cov, constraints, max_single_asset_weight=0.50)
        assert result.status == "BLOCKED"
        assert result.valid is False
        assert any("Single position concentration" in v for v in result.violations)

    def test_volatility_ceiling_breach_blocks(self, mock_assets, sample_cov):
        # 50% Equity has volatility sqrt(0.50^2 * 0.20^2) = 0.10
        # If max_volatility is 0.05, it must breach and block
        weights = np.array([0.50, 0.20, 0.10, 0.10, 0.10])
        constraints = {"max_equity": 0.50, "min_cash": 0.05, "max_volatility": 0.05}

        result = validate_candidate_allocation(weights, mock_assets, sample_cov, constraints)
        assert result.status == "BLOCKED"
        assert result.valid is False
        assert any("Portfolio volatility" in v for v in result.violations)
