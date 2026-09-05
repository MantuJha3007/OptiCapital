"""Portfolio schemas."""

from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.schemas.asset import AssetOut


class CustomHoldingInput(BaseModel):
    symbol: str
    weight: float = Field(..., ge=0.0, le=1.0)


class CustomPortfolioInput(BaseModel):
    name: str = "Corporate Treasury"
    total_capital: float = Field(..., gt=0.0)
    risk_aversion: float = Field(default=1.0, ge=0.1, le=5.0)
    holdings: list[CustomHoldingInput]

    @field_validator("holdings")
    @classmethod
    def validate_holdings_sum(cls, v: list[CustomHoldingInput]) -> list[CustomHoldingInput]:
        if not v:
            raise ValueError("At least one holding must be provided.")
        total_weight = sum(h.weight for h in v)
        if abs(total_weight - 1.0) > 0.005:
            raise ValueError(
                f"Total allocation weights must sum to 100% (got {total_weight * 100:.1f}%)."
            )
        return v


class HoldingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    asset_id: UUID
    asset: AssetOut | None = None
    weight: float
    market_value: float


class PortfolioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    total_capital: float
    risk_aversion: float
    holdings: list[HoldingOut] = []
    created_at: datetime
    updated_at: datetime



from app.schemas.risk import RiskResponse


class CustomPortfolioResponse(BaseModel):
    portfolio: PortfolioOut
    risk: RiskResponse

