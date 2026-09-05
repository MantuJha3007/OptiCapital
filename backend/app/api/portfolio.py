"""Portfolio API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.portfolio_service import get_default_portfolio
from decimal import Decimal
from pydantic import BaseModel
from app.models.holding import Holding
from app.models.asset import Asset
from app.schemas.portfolio import PortfolioOut

router = APIRouter()


class PortfolioUpdateRequest(BaseModel):
    total_capital: float | None = None
    weights: dict[str, float] | None = None


@router.get("/portfolio", response_model=PortfolioOut)
def get_portfolio(db: Session = Depends(get_db)):
    """Get the current portfolio with holdings."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found. Run the seed script first.")
    return portfolio


@router.post("/portfolio/reset")
def reset_portfolio(db: Session = Depends(get_db)):
    """Reset the portfolio to baseline defaults (₹1.00 Cr, 45% Equity, 25% Gov Bonds, 15% Corp Bonds, 10% Gold, 5% Cash)."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    asset_map = {a.symbol: a for a in db.query(Asset).all()}
    defaults = {
        "EQUITY": 0.45,
        "GOV_BONDS": 0.25,
        "CORP_BONDS": 0.15,
        "GOLD": 0.10,
        "CASH": 0.05,
    }
    capital = 10_000_000.0
    portfolio.total_capital = Decimal(str(capital))

    for sym, w in defaults.items():
        if sym in asset_map:
            h = db.query(Holding).filter(
                Holding.portfolio_id == portfolio.id,
                Holding.asset_id == asset_map[sym].id,
            ).first()
            if h:
                h.weight = w
                h.market_value = Decimal(str(round(w * capital, 2)))

    db.commit()
    db.refresh(portfolio)
    return {"status": "success", "message": "Portfolio reset to baseline ₹1.00 Cr defaults"}


@router.post("/portfolio/update")
def update_portfolio(payload: PortfolioUpdateRequest, db: Session = Depends(get_db)):
    """Dynamically update portfolio capital or asset weights."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    capital = float(payload.total_capital) if payload.total_capital is not None else float(portfolio.total_capital)
    portfolio.total_capital = Decimal(str(capital))

    if payload.weights:
        asset_map = {a.symbol: a for a in db.query(Asset).all()}
        # Normalize weights to sum to 1.0 if needed
        total_w = sum(payload.weights.values())
        norm_w = {k: v / total_w for k, v in payload.weights.items()} if total_w > 0 else payload.weights

        for sym, w in norm_w.items():
            if sym in asset_map:
                h = db.query(Holding).filter(
                    Holding.portfolio_id == portfolio.id,
                    Holding.asset_id == asset_map[sym].id,
                ).first()
                if h:
                    h.weight = float(w)
                    h.market_value = Decimal(str(round(float(w) * capital, 2)))

    db.commit()
    db.refresh(portfolio)
    return {"status": "success", "message": "Portfolio updated successfully"}
