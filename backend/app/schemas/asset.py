"""Asset schemas."""

from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AssetOut(BaseModel):
    id: UUID
    symbol: str
    name: str
    category: str
    expected_return: float
    volatility: float
    liquidity_score: float
    min_weight: float
    max_weight: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
