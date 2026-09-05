"""Risk API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.portfolio_service import get_default_portfolio
from app.services.risk_engine import calculate_risk, save_risk_snapshot
from app.schemas.risk import RiskResponse, RiskMetrics

router = APIRouter()


@router.get("/risk", response_model=RiskResponse)
def get_risk(db: Session = Depends(get_db)):
    """Calculate current risk metrics and save a snapshot."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    result = calculate_risk(db, portfolio)
    snapshot = save_risk_snapshot(db, portfolio.id, result)

    return RiskResponse(
        metrics=RiskMetrics(
            expected_return=round(result.expected_return, 4),
            volatility=round(result.volatility, 4),
            max_drawdown=round(result.max_drawdown, 4),
            liquidity_ratio=round(result.liquidity_ratio, 4),
            concentration=round(result.concentration, 4),
            market_stress=round(result.market_stress, 4),
            risk_score=round(result.risk_score, 1),
            risk_level=result.risk_level,
            risk_status=result.risk_status,
            operating_envelope=result.operating_envelope,
            intervention_required=result.intervention_required,
            var_95=round(result.var_95, 4),
            cvar_95=round(result.cvar_95, 4),
        ),
        snapshot_id=snapshot.id,
    )


@router.get("/risk/attribution")
def get_risk_attribution(db: Session = Depends(get_db)):
    """Calculate Euler marginal and percentage risk attribution."""
    from app.services.risk_attribution import compute_risk_attribution

    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    return compute_risk_attribution(db, portfolio)
