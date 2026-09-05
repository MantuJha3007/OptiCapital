"""Portfolio API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.portfolio_service import get_default_portfolio, update_custom_portfolio
from app.schemas.portfolio import (
    PortfolioOut,
    CustomPortfolioInput,
    CustomPortfolioResponse,
)
from app.schemas.risk import RiskResponse, RiskMetrics

router = APIRouter()


@router.get("/portfolio", response_model=PortfolioOut)
def get_portfolio(db: Session = Depends(get_db)):
    """Get the current portfolio with holdings."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found. Run the seed script first.")
    return portfolio


@router.post("/portfolio/custom", response_model=CustomPortfolioResponse)
def set_custom_portfolio(data: CustomPortfolioInput, db: Session = Depends(get_db)):
    """Update active portfolio with custom corporate capital and holdings."""
    try:
        portfolio, risk_result, snapshot = update_custom_portfolio(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update custom portfolio: {str(e)}")

    risk_response = RiskResponse(
        metrics=RiskMetrics(
            expected_return=round(risk_result.expected_return, 4),
            volatility=round(risk_result.volatility, 4),
            max_drawdown=round(risk_result.max_drawdown, 4),
            liquidity_ratio=round(risk_result.liquidity_ratio, 4),
            concentration=round(risk_result.concentration, 4),
            market_stress=round(risk_result.market_stress, 4),
            risk_score=round(risk_result.risk_score, 1),
            risk_level=risk_result.risk_level,
        ),
        snapshot_id=snapshot.id,
    )

    return CustomPortfolioResponse(portfolio=portfolio, risk=risk_response)

