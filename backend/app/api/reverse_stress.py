"""Reverse Stress Testing API endpoint."""

from typing import Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.portfolio_service import get_default_portfolio
from app.services.reverse_stress import run_reverse_stress_sweep

router = APIRouter()


class ReverseStressRequest(BaseModel):
    failure_threshold_score: float = 80.0
    weights_override: dict[str, float] | None = None


@router.post("/stress/reverse")
def post_reverse_stress(
    payload: ReverseStressRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Execute reverse stress sweep and compute Distance to Failure."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    return run_reverse_stress_sweep(
        db,
        portfolio,
        failure_threshold_score=payload.failure_threshold_score,
        weights_override=payload.weights_override,
    )
