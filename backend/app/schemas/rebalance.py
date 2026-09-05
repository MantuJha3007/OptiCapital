"""Rebalance schemas."""

from uuid import UUID

from pydantic import BaseModel


class RebalanceRequest(BaseModel):
    optimization_id: UUID
    approved: bool


class RebalanceResponse(BaseModel):
    rebalance_id: UUID
    action: str
    approved: bool
    transaction_cost: float | None
    risk_before: float | None
    risk_after: float | None
    reason: str | None
    message: str
