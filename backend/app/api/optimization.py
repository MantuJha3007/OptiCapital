"""Optimization API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.portfolio_service import (
    get_default_portfolio,
    get_holdings_data,
    get_assets_ordered,
    get_asset_symbols,
)
from app.services.market_data_service import (
    get_price_dataframe,
    compute_annualized_stats,
)
from app.services.risk_engine import calculate_risk, save_risk_snapshot
from app.services.control_engine import evaluate_controls
from app.services.optimizer import optimize_portfolio, save_optimization_run
from app.services.explanation_service import generate_explanation
from app.services.rebalancer import determine_action, save_rebalance_action
from app.schemas.optimization import OptimizationResult, AllocationItem, OptimizationRequest
from app.models.optimization import OptimizationRun
from app.config import settings

import numpy as np

router = APIRouter()


@router.get("/optimization")
def get_recent_optimizations(db: Session = Depends(get_db)):
    """Get recent optimization runs."""
    runs = (
        db.query(OptimizationRun)
        .order_by(OptimizationRun.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "risk_level": r.risk_level,
            "status": r.status,
            "expected_return_before": r.expected_return_before,
            "volatility_before": r.volatility_before,
            "expected_return_after": r.expected_return_after,
            "volatility_after": r.volatility_after,
            "transaction_cost": float(r.transaction_cost) if r.transaction_cost else None,
            "created_at": r.created_at.isoformat(),
        }
        for r in runs
    ]


@router.post("/optimize", response_model=OptimizationResult)
def run_optimization(
    request: OptimizationRequest = OptimizationRequest(),
    db: Session = Depends(get_db),
):
    """Run portfolio optimization with the current risk level."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    asset_ids, weights, exp_rets, vols, liq_scores, _ = get_holdings_data(portfolio)
    assets = get_assets_ordered(portfolio)
    symbols = get_asset_symbols(portfolio)
    portfolio_value = float(portfolio.total_capital)

    # Risk assessment
    risk = calculate_risk(db, portfolio)
    save_risk_snapshot(db, portfolio.id, risk)

    # Control engine
    control = evaluate_controls(risk)

    # Market data
    prices = get_price_dataframe(db, [UUID(a) for a in asset_ids])
    if not prices.empty:
        mean_rets, cov_matrix = compute_annualized_stats(prices, asset_ids)
    else:
        mean_rets = exp_rets
        cov_matrix = np.diag(vols ** 2)

    ra = request.risk_aversion or settings.risk_aversion

    # Optimize
    result = optimize_portfolio(
        mean_returns=mean_rets,
        cov_matrix=cov_matrix,
        current_weights=weights,
        assets=assets,
        portfolio_value=portfolio_value,
        risk_aversion=ra,
        constraints=control.constraints,
    )

    # Generate explanation
    risk_after = calculate_risk(db, portfolio, weights_override=result.weights)
    explanation = generate_explanation(
        risk_before=risk,
        risk_after=risk_after,
        control=control,
        assets=assets,
        old_weights=weights,
        new_weights=result.weights,
    )
    result.explanation = explanation

    # Save
    opt_run = save_optimization_run(
        db=db,
        portfolio_id=portfolio.id,
        risk_level=control.risk_level,
        risk_aversion=ra,
        return_before=risk.expected_return,
        vol_before=risk.volatility,
        result=result,
        assets=assets,
        old_weights=weights,
    )

    allocations = [
        AllocationItem(
            symbol=symbols[i],
            name=assets[i].name,
            old_weight=round(float(weights[i]), 4),
            new_weight=round(float(result.weights[i]), 4),
        )
        for i in range(len(assets))
    ]

    return OptimizationResult(
        optimization_id=opt_run.id,
        status=result.status,
        risk_level=control.risk_level,
        expected_return_before=round(risk.expected_return, 4),
        volatility_before=round(risk.volatility, 4),
        expected_return_after=round(result.expected_return, 4),
        volatility_after=round(result.volatility, 4),
        transaction_cost=round(result.txn_cost, 2),
        allocations=allocations,
        explanation=explanation,
    )
