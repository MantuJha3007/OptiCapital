"""Optimization schemas."""

from uuid import UUID

from pydantic import BaseModel


class AllocationItem(BaseModel):
    symbol: str
    name: str
    old_weight: float
    new_weight: float


class OptimizationResult(BaseModel):
    optimization_id: UUID
    status: str
    risk_level: str
    expected_return_before: float | None
    volatility_before: float | None
    expected_return_after: float | None
    volatility_after: float | None
    transaction_cost: float | None
    allocations: list[AllocationItem]
    explanation: str


class OptimizationRequest(BaseModel):
    """Optional overrides for optimization."""
    risk_aversion: float | None = None
