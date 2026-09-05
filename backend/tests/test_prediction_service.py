"""Tests for AEGIS Risk Prediction Service."""

import pytest
import numpy as np
from app.services.prediction_service import (
    compute_ewma_volatility_forecast,
    predict_risk_conditions,
)
from app.database import SessionLocal
from app.services.portfolio_service import get_default_portfolio


def test_ewma_volatility_forecast():
    # Constant series should return close to 0 vol
    flat_returns = np.zeros(100)
    vol = compute_ewma_volatility_forecast(flat_returns)
    assert 0.02 <= vol <= 0.80

    # High-volatility synthetic returns
    high_vol_returns = np.random.normal(0, 0.03, 100)
    high_vol = compute_ewma_volatility_forecast(high_vol_returns)
    assert high_vol > 0.15


def test_predict_risk_conditions():
    db = SessionLocal()
    try:
        portfolio = get_default_portfolio(db)
        assert portfolio is not None

        pred = predict_risk_conditions(db, portfolio, horizon_days=5)

        assert pred["model_type"] == "FORECAST"
        assert pred["horizon_days"] == 5
        assert 0.0 <= pred["probability_deterioration"] <= 1.0
        assert 0.0 <= pred["probability_red_breach"] <= 1.0
        assert pred["expected_volatility"] > 0
        assert len(pred["expected_drawdown_range"]) == 2
        assert pred["expected_drawdown_range"][0] <= pred["expected_drawdown_range"][1]
        assert "FORECAST" in pred["model_type"]
    finally:
        db.close()
