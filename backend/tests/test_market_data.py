"""Tests for AEGIS Market Data Providers."""

import pytest
import pandas as pd
from app.services.market_data.demo_provider import DemoMarketDataProvider
from app.services.market_data.csv_provider import CSVMarketDataProvider
from app.services.market_data.live_provider import LiveMarketDataProvider
from app.services.market_data import (
    get_market_data_provider,
    set_market_data_provider,
    register_csv_provider,
    get_market_data_status,
)


def test_demo_market_data_provider():
    provider = DemoMarketDataProvider()
    prices = provider.get_prices(lookback_days=30)
    assert not prices.empty
    assert len(prices) == 30
    assert "EQUITY" in prices.columns

    returns = provider.get_returns(lookback_days=30)
    assert not returns.empty
    assert len(returns) == 29

    vols = provider.get_volatility()
    assert "EQUITY" in vols
    assert vols["EQUITY"] > 0

    idx = provider.get_market_index(lookback_days=30)
    assert len(idx) == 29

    meta = provider.get_metadata()
    assert meta["provider"] == "DEMO"
    assert meta["status"] == "ONLINE"


def test_csv_market_data_provider():
    csv_text = """Date,ASSET_A,ASSET_B
2024-01-01,100,200
2024-01-02,102,198
2024-01-03,101,201
2024-01-04,103,205
2024-01-05,105,202
"""
    provider = CSVMarketDataProvider(csv_content=csv_text, filename="test.csv")
    meta = provider.get_metadata()
    assert meta["provider"] == "CSV"
    assert meta["observations"] == 5
    assert "ASSET_A" in meta["symbols"]

    prices = provider.get_prices()
    assert len(prices) == 5

    rets = provider.get_returns()
    assert len(rets) == 4


def test_provider_manager_and_status():
    set_market_data_provider("demo")
    status = get_market_data_status()
    assert status["active_provider"] == "demo"
    assert "demo" in status["available_providers"]
