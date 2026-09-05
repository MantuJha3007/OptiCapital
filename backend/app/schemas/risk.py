"""Risk schemas."""

from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class RiskMetrics(BaseModel):
    """Core risk metrics calculated by the risk engine."""
    expected_return: float
    volatility: float
    max_drawdown: float
    liquidity_ratio: float
    concentration: float
    market_stress: float
    risk_score: float
    risk_level: str
    risk_status: str | None = None
    operating_envelope: str | None = None
    intervention_required: bool | None = None
    var_95: float | None = None
    cvar_95: float | None = None


class RiskSnapshotOut(BaseModel):
    id: UUID
    portfolio_id: UUID
    risk_score: float
    risk_level: str
    expected_return: float | None
    volatility: float | None
    max_drawdown: float | None
    liquidity_ratio: float | None
    concentration: float | None
    market_stress: float | None
    created_at: datetime

    class Config:
        from_attributes = True


class RiskResponse(BaseModel):
    """Full risk response for the API."""
    metrics: RiskMetrics
    snapshot_id: UUID
