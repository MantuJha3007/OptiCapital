"""Tests for AEGIS Master State API Endpoint."""

from fastapi.testclient import TestClient
from app.main import app


def test_master_state_endpoint():
    client = TestClient(app)
    response = client.get("/api/state/master")
    assert response.status_code == 200

    data = response.json()
    assert "portfolio" in data
    assert "market" in data
    assert "risk" in data
    assert "prediction" in data
    assert "resilience" in data
    assert "active_recommendation" in data
    assert "validator_result" in data
    assert "copilot" in data

    # Check key contracts
    assert data["portfolio"]["total_capital"] > 0
    assert len(data["portfolio"]["holdings"]) > 0
    assert "operating_envelope" in data["risk"]
    assert "regime" in data["market"]
    assert "distance_to_failure" in data["resilience"]
    assert data["prediction"]["model_type"] == "FORECAST"
    assert "all_passed" in data["validator_result"]
