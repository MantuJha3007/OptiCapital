"""Scenarios API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.portfolio_service import get_default_portfolio
from app.services.scenario_engine import get_all_scenarios, get_scenario_by_id, run_scenario
from app.schemas.scenario import ScenarioOut, ScenarioShockOut, ScenarioRunRequest

router = APIRouter()


@router.get("/scenarios")
def list_scenarios(db: Session = Depends(get_db)):
    """List all available scenarios with their shocks."""
    scenarios = get_all_scenarios(db)
    result = []
    for s in scenarios:
        shocks = [
            ScenarioShockOut(
                asset_symbol=sh.asset.symbol,
                asset_name=sh.asset.name,
                shock_percentage=sh.shock_percentage,
            )
            for sh in s.shocks
        ]
        result.append(
            {
                "id": str(s.id),
                "name": s.name,
                "description": s.description,
                "shocks": [sh.model_dump() for sh in shocks],
            }
        )
    return result


@router.post("/scenarios/run")
def run_scenario_endpoint(
    request: ScenarioRunRequest,
    db: Session = Depends(get_db),
):
    """Run a scenario simulation — the most important endpoint.

    Returns complete before/after analysis including risk assessment,
    dynamic controls, optimization, transaction cost, and recommendation.
    """
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    scenario = get_scenario_by_id(db, request.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    result = run_scenario(db, portfolio, scenario)
    return result


from pydantic import BaseModel, Field
from app.services.reverse_stress_service import run_reverse_stress_test


class ReverseStressRequest(BaseModel):
    loss_threshold_pct: float = Field(default=0.10, ge=0.01, le=0.90, description="Target loss threshold fraction")


@router.post("/scenarios/reverse-stress")
def reverse_stress_endpoint(
    request: ReverseStressRequest = ReverseStressRequest(),
    db: Session = Depends(get_db),
):
    """Run Reverse Stress Testing: identifies the minimal shock combination needed
    to breach a specified capital/drawdown threshold, scored by Mahalanobis distance.
    """
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    return run_reverse_stress_test(db, portfolio, request.loss_threshold_pct)

