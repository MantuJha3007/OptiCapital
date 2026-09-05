"""Portfolio schemas."""

from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.asset import AssetOut


class HoldingOut(BaseModel):
    id: UUID
    asset_id: UUID
    asset: AssetOut | None = None
    weight: float
    market_value: float

    model_config = ConfigDict(from_attributes=True)


class PortfolioOut(BaseModel):
    id: UUID
    name: str
    total_capital: float
    risk_aversion: float
    holdings: list[HoldingOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
