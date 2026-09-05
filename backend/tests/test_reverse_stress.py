"""Tests for reverse stress testing service and endpoint."""

from decimal import Decimal
from unittest.mock import MagicMock, patch
import pytest
import numpy as np

from app.models.portfolio import Portfolio
from app.models.holding import Holding
from app.models.asset import Asset
from app.services.reverse_stress_service import run_reverse_stress_test


def create_mock_portfolio():
    assets = [
        Asset(id="11111111-1111-1111-1111-111111111111", symbol="EQUITY", name="Nifty 50 ETF", category="EQUITY", expected_return=0.12, volatility=0.18, liquidity_score=0.9),
        Asset(id="22222222-2222-2222-2222-222222222222", symbol="GOV_BONDS", name="10Y G-Sec ETF", category="FIXED_INCOME", expected_return=0.07, volatility=0.06, liquidity_score=0.95),
        Asset(id="33333333-3333-3333-3333-333333333333", symbol="CORP_BONDS", name="Corporate Bond ETF", category="FIXED_INCOME", expected_return=0.085, volatility=0.08, liquidity_score=0.8),
        Asset(id="44444444-4444-4444-4444-444444444444", symbol="GOLD", name="Gold ETF", category="COMMODITY", expected_return=0.09, volatility=0.14, liquidity_score=0.85),
        Asset(id="55555555-5555-5555-5555-555555555555", symbol="CASH", name="Liquid BeES", category="CASH", expected_return=0.05, volatility=0.01, liquidity_score=1.0),
    ]

    weights = [0.40, 0.25, 0.15, 0.10, 0.10]
    holdings = []
    capital = 10000000.0
    for i, a in enumerate(assets):
        h = Holding(
            id=f"11111111-0000-0000-0000-00000000000{i+1}",
            asset_id=a.id,
            asset=a,
            weight=weights[i],
            market_value=Decimal(str(weights[i] * capital)),
        )
        holdings.append(h)


    portfolio = Portfolio(
        id="99999999-9999-9999-9999-999999999999",
        name="Aegis Institutional Treasury",
        total_capital=Decimal("10000000.00"),
        risk_aversion=Decimal("2.5"),
        holdings=holdings,
    )
    return portfolio


class TestReverseStressService:
    """Test reverse stress testing algorithm."""

    @patch("app.services.reverse_stress_service.get_price_dataframe")
    def test_reverse_stress_finds_breach(self, mock_prices):
        # Empty prices forces fallback covariance
        import pandas as pd
        mock_prices.return_value = pd.DataFrame()

        mock_db = MagicMock()
        portfolio = create_mock_portfolio()

        result = run_reverse_stress_test(mock_db, portfolio, loss_threshold_pct=0.10)

        assert result["target_loss_pct"] == 0.10
        assert result["projected_loss_pct"] >= 0.099  # Within floating point tolerance
        assert result["capital_after"] < result["capital_before"]
        assert "minimal_shocks" in result
        assert "EQUITY" in result["minimal_shocks"]
        assert result["mahalanobis_distance_sigma"] > 0
        assert len(result["vulnerabilities"]) == 5
        assert "narrative" in result
        assert "breach" in result["narrative"].lower()

    @patch("app.services.reverse_stress_service.get_price_dataframe")
    def test_reverse_stress_custom_threshold(self, mock_prices):
        import pandas as pd
        mock_prices.return_value = pd.DataFrame()

        mock_db = MagicMock()
        portfolio = create_mock_portfolio()

        result = run_reverse_stress_test(mock_db, portfolio, loss_threshold_pct=0.20)
        assert result["target_loss_pct"] == 0.20
        assert result["projected_loss_pct"] >= 0.199
        assert result["capital_after"] < result["capital_before"]
