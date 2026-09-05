"""Rebalancer — determines action and persists audit trail."""

import uuid
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from app.core.time import utcnow

from sqlalchemy.orm import Session

from app.models.rebalance import RebalanceAction
from app.models.holding import Holding
from app.models.optimization import OptimizationRun, OptimizationAllocation
from app.models.portfolio import Portfolio
from app.services.risk_engine import RiskResult
from app.services.control_engine import ControlResult
from app.core.constants import (
    ACTION_HOLD,
    ACTION_REBALANCE,
    ACTION_CRISIS_PROTECTION,
    RISK_LEVEL_SAFE,
    RISK_LEVEL_STRESS,
    RISK_LEVEL_CRISIS,
)


def determine_action(risk: RiskResult, control: ControlResult) -> str:
    """Decide: HOLD, REBALANCE, or CRISIS_PROTECTION."""
    if control.risk_level == RISK_LEVEL_CRISIS:
        return ACTION_CRISIS_PROTECTION
    elif control.risk_level in (RISK_LEVEL_STRESS,) and len(control.breaches) > 0:
        return ACTION_REBALANCE
    elif len(control.breaches) > 0:
        return ACTION_REBALANCE
    else:
        return ACTION_HOLD


def save_rebalance_action(
    db: Session,
    portfolio_id: UUID,
    optimization_id: UUID,
    action: str,
    transaction_cost: float,
    risk_before: float,
    risk_after: float,
    reason: str,
) -> RebalanceAction:
    """Persist a rebalance recommendation to PostgreSQL."""
    ra = RebalanceAction(
        id=uuid.uuid4(),
        portfolio_id=portfolio_id,
        optimization_id=optimization_id,
        action=action,
        approved=False,
        transaction_cost=round(Decimal(str(transaction_cost)), 2),
        risk_before=risk_before,
        risk_after=risk_after,
        reason=reason,
    )
    db.add(ra)
    db.commit()
    db.refresh(ra)
    return ra


def approve_rebalance(
    db: Session,
    optimization_id: UUID,
) -> dict:
    """Approve a rebalance: update simulated holdings in PostgreSQL.

    Returns summary of what was done.
    """
    # Find the optimization run
    opt_run = (
        db.query(OptimizationRun)
        .filter(OptimizationRun.id == optimization_id)
        .first()
    )
    if not opt_run:
        return {"error": "Optimization run not found."}

    # Find the rebalance action
    ra = (
        db.query(RebalanceAction)
        .filter(RebalanceAction.optimization_id == optimization_id)
        .first()
    )

    # Get the allocations
    allocations = (
        db.query(OptimizationAllocation)
        .filter(OptimizationAllocation.optimization_id == optimization_id)
        .all()
    )
    if not allocations:
        return {"error": "No allocations found for this optimization."}

    # Get portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.id == opt_run.portfolio_id).first()
    if not portfolio:
        return {"error": "Portfolio not found."}

    portfolio_value = float(portfolio.total_capital)

    # Update holdings
    for alloc in allocations:
        holding = (
            db.query(Holding)
            .filter(
                Holding.portfolio_id == opt_run.portfolio_id,
                Holding.asset_id == alloc.asset_id,
            )
            .first()
        )
        if holding:
            holding.weight = alloc.new_weight
            holding.market_value = Decimal(str(round(alloc.new_weight * portfolio_value, 2)))
            holding.updated_at = utcnow()

    # Mark rebalance as approved
    if ra:
        ra.approved = True

    # Update portfolio timestamp
    portfolio.updated_at = utcnow()

    db.commit()

    return {
        "status": "approved",
        "portfolio_id": str(opt_run.portfolio_id),
        "optimization_id": str(optimization_id),
        "message": "Holdings updated successfully. Rebalance approved.",
    }


def reject_rebalance(
    db: Session,
    optimization_id: UUID,
) -> dict:
    """Reject a rebalance recommendation."""
    ra = (
        db.query(RebalanceAction)
        .filter(RebalanceAction.optimization_id == optimization_id)
        .first()
    )
    if ra:
        ra.approved = False
        ra.reason = (ra.reason or "") + " [REJECTED BY USER]"
        db.commit()

    return {
        "status": "rejected",
        "optimization_id": str(optimization_id),
        "message": "Rebalance recommendation rejected.",
    }
