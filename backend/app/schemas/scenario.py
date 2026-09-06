"""Scenario schemas."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ScenarioShockOut(BaseModel):
    asset_symbol: str
    asset_name: str
    shock_percentage: float


class ScenarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    shocks: list[ScenarioShockOut] = []


class ScenarioRunRequest(BaseModel):
    scenario_id: UUID


class ScenarioRunResponse(BaseModel):
    """Complete before/after response from running a scenario."""

    scenario: dict
    before: dict
    shock: dict
    after_shock: dict
    control: dict
    recommendation: dict
