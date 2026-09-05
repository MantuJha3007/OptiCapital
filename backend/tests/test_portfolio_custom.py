"""Tests for custom portfolio onboarding and input validation."""

from decimal import Decimal
from unittest.mock import MagicMock, patch
import pytest
from pydantic import ValidationError

from app.schemas.portfolio import CustomHoldingInput, CustomPortfolioInput
from app.services.portfolio_service import update_custom_portfolio
from app.models.portfolio import Portfolio
from app.models.holding import Holding
from app.models.asset import Asset


class TestCustomPortfolioInputValidation:
    """Test validation of custom corporate portfolio input."""

    def test_valid_portfolio_input(self):
        data = CustomPortfolioInput(
            name="Adani Capital Treasury",
            total_capital=500_000_000.0,
            risk_aversion=1.5,
            holdings=[
                CustomHoldingInput(symbol="EQUITY", weight=0.30),
                CustomHoldingInput(symbol="GOV_BONDS", weight=0.30),
                CustomHoldingInput(symbol="CORP_BONDS", weight=0.20),
                CustomHoldingInput(symbol="GOLD", weight=0.10),
                CustomHoldingInput(symbol="CASH", weight=0.10),
            ],
        )
        assert data.name == "Adani Capital Treasury"
        assert data.total_capital == 500_000_000.0
        assert data.risk_aversion == 1.5
        assert len(data.holdings) == 5

    def test_weight_sum_tolerance(self):
        # 33.3% + 33.3% + 33.4% = 100.0%
        data = CustomPortfolioInput(
            name="Test Tolerant",
            total_capital=10_000_000.0,
            holdings=[
                CustomHoldingInput(symbol="EQUITY", weight=0.333),
                CustomHoldingInput(symbol="GOV_BONDS", weight=0.333),
                CustomHoldingInput(symbol="CASH", weight=0.334),
            ],
        )
        assert sum(h.weight for h in data.holdings) == 1.0

    def test_invalid_weight_sum_too_low(self):
        with pytest.raises(ValidationError) as exc_info:
            CustomPortfolioInput(
                name="Under-allocated",
                total_capital=10_000_000.0,
                holdings=[
                    CustomHoldingInput(symbol="EQUITY", weight=0.40),
                    CustomHoldingInput(symbol="GOV_BONDS", weight=0.40),
                ],
            )
        assert "Total allocation weights must sum to 100%" in str(exc_info.value)

    def test_invalid_weight_sum_too_high(self):
        with pytest.raises(ValidationError) as exc_info:
            CustomPortfolioInput(
                name="Over-allocated",
                total_capital=10_000_000.0,
                holdings=[
                    CustomHoldingInput(symbol="EQUITY", weight=0.70),
                    CustomHoldingInput(symbol="GOV_BONDS", weight=0.50),
                ],
            )
        assert "Total allocation weights must sum to 100%" in str(exc_info.value)

    def test_negative_capital_rejected(self):
        with pytest.raises(ValidationError):
            CustomPortfolioInput(
                name="Negative Capital",
                total_capital=-1_000_000.0,
                holdings=[
                    CustomHoldingInput(symbol="EQUITY", weight=1.0),
                ],
            )

    def test_individual_weight_out_of_bounds(self):
        with pytest.raises(ValidationError):
            CustomHoldingInput(symbol="EQUITY", weight=1.5)

        with pytest.raises(ValidationError):
            CustomHoldingInput(symbol="EQUITY", weight=-0.1)

    def test_empty_holdings_rejected(self):
        with pytest.raises(ValidationError):
            CustomPortfolioInput(
                name="Empty Portfolio",
                total_capital=10_000_000.0,
                holdings=[],
            )


class TestUpdateCustomPortfolioService:
    """Test update_custom_portfolio logic with mock DB."""

    def test_rejects_unknown_asset_symbol(self):
        db = MagicMock()
        mock_asset = MagicMock(spec=Asset)
        mock_asset.symbol = "EQUITY"
        mock_asset.id = "asset-1"
        db.query.return_value.all.return_value = [mock_asset]
        db.query.return_value.options.return_value.first.return_value = MagicMock(spec=Portfolio, holdings=[])

        payload = CustomPortfolioInput(
            name="Crypto Treasury",
            total_capital=10_000_000.0,
            holdings=[
                CustomHoldingInput(symbol="BITCOIN", weight=1.0),
            ],
        )

        with pytest.raises(ValueError) as exc:
            update_custom_portfolio(db, payload)
        assert "Unknown asset symbol: 'BITCOIN'" in str(exc.value)

    @patch("app.services.risk_engine.save_risk_snapshot")
    @patch("app.services.risk_engine.calculate_risk")
    def test_valid_custom_portfolio_update(self, mock_calc_risk, mock_save_snapshot):
        db = MagicMock()

        # Mock existing assets
        mock_asset_eq = MagicMock(spec=Asset, symbol="EQUITY", id="asset-eq")
        mock_asset_gov = MagicMock(spec=Asset, symbol="GOV_BONDS", id="asset-gov")
        db.query.return_value.all.return_value = [mock_asset_eq, mock_asset_gov]

        # Mock existing portfolio
        existing_holding = MagicMock(spec=Holding, asset_id="asset-eq", weight=0.5, asset=mock_asset_eq)
        mock_portfolio = MagicMock(
            spec=Portfolio,
            id="port-1",
            name="Old Portfolio",
            total_capital=Decimal("10000000"),
            risk_aversion=1.0,
            holdings=[existing_holding],
        )
        # get_default_portfolio query and reload query return mock_portfolio
        db.query.return_value.options.return_value.first.return_value = mock_portfolio
        db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_portfolio

        mock_risk_result = MagicMock(
            expected_return=0.10,
            volatility=0.12,
            max_drawdown=0.08,
            liquidity_ratio=0.90,
            concentration=0.50,
            market_stress=0.15,
            risk_score=35.0,
            risk_level="SAFE",
        )
        mock_calc_risk.return_value = mock_risk_result
        mock_snapshot = MagicMock(id="snap-1")
        mock_save_snapshot.return_value = mock_snapshot

        payload = CustomPortfolioInput(
            name="Custom Corporate",
            total_capital=250_000_000.0,
            risk_aversion=2.0,
            holdings=[
                CustomHoldingInput(symbol="EQUITY", weight=0.40),
                CustomHoldingInput(symbol="GOV_BONDS", weight=0.60),
            ],
        )

        portfolio, risk_result, snapshot = update_custom_portfolio(db, payload)

        assert mock_portfolio.name == "Custom Corporate"
        assert mock_portfolio.total_capital == Decimal("250000000.00")
        assert mock_portfolio.risk_aversion == 2.0
        assert existing_holding.weight == 0.40
        assert existing_holding.market_value == Decimal("100000000.00")
        assert risk_result == mock_risk_result
        assert snapshot == mock_snapshot
        assert db.commit.called
