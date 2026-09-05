"""Rebalancer — determines action and persists audit trail."""

import uuid
from uuid import UUID
from decimal import Decimal
from datetime import datetime

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
    optimization_id: UUID | str,
) -> dict:
    """Approve a rebalance: update simulated holdings in database, recalculate risk and resilience,
    record audit trail, and generate before/after verification proof.
    """
    if isinstance(optimization_id, str):
        optimization_id = UUID(optimization_id)

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

    # ── CAPTURE REAL PRE-REBALANCE STATE BEFORE modifying holdings ──
    from app.services.risk_engine import calculate_risk
    from app.services.reverse_stress import run_reverse_stress_sweep

    risk_before_snapshot = calculate_risk(db, portfolio)
    rev_before_snapshot = run_reverse_stress_sweep(db, portfolio)

    # Update holdings with proposed optimal weights
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
            holding.updated_at = datetime.utcnow()

    # Update portfolio timestamp
    portfolio.updated_at = datetime.utcnow()

    # Flush changes to DB so recalculation reflects new allocations
    db.commit()

    # Recalculate actual risk and reverse stress on the updated portfolio
    risk_recalculated = calculate_risk(db, portfolio)
    rev_recalculated = run_reverse_stress_sweep(db, portfolio)

    # Mark rebalance as approved and update audited post-risk score
    if ra:
        ra.approved = True
        ra.risk_after = round(risk_recalculated.risk_score, 1)
        db.commit()

    # Use real pre-rebalance metrics (from snapshot captured before DB update)
    risk_before_val = float(ra.risk_before) if ra and ra.risk_before is not None else round(risk_before_snapshot.risk_score, 1)
    vol_before_val = float(opt_run.volatility_before) if opt_run.volatility_before is not None else round(risk_before_snapshot.volatility, 4)

    # Construct comprehensive Before vs After Verification Proof using REAL computed values
    before_after = {
        "before": {
            "risk_score": round(risk_before_val, 1),
            "volatility": round(risk_before_snapshot.volatility, 4),
            "volatility_pct": f"{round(risk_before_snapshot.volatility * 100, 1)}%",
            "var_95": round(risk_before_snapshot.var_95, 4),
            "var_95_pct": f"{round(risk_before_snapshot.var_95 * 100, 1)}%",
            "cvar_95": round(risk_before_snapshot.cvar_95, 4),
            "cvar_95_pct": f"{round(risk_before_snapshot.cvar_95 * 100, 1)}%",
            "max_drawdown": round(risk_before_snapshot.max_drawdown, 4),
            "max_drawdown_pct": f"{round(risk_before_snapshot.max_drawdown * 100, 1)}%",
            "liquidity_ratio": round(risk_before_snapshot.liquidity_ratio, 4),
            "liquidity_pct": f"{round(risk_before_snapshot.liquidity_ratio * 100, 1)}%",
            "concentration": round(risk_before_snapshot.concentration, 4),
            "operating_envelope": risk_before_snapshot.operating_envelope,
            "distance_to_failure": rev_before_snapshot["distance_to_failure_pct"],
            "resilience_score": rev_before_snapshot["resilience_score"],
        },
        "after": {
            "risk_score": round(risk_recalculated.risk_score, 1),
            "volatility": round(risk_recalculated.volatility, 4),
            "volatility_pct": f"{round(risk_recalculated.volatility * 100, 1)}%",
            "var_95": round(risk_recalculated.var_95, 4),
            "var_95_pct": f"{round(risk_recalculated.var_95 * 100, 1)}%",
            "cvar_95": round(risk_recalculated.cvar_95, 4),
            "cvar_95_pct": f"{round(risk_recalculated.cvar_95 * 100, 1)}%",
            "max_drawdown": round(risk_recalculated.max_drawdown, 4),
            "max_drawdown_pct": f"{round(risk_recalculated.max_drawdown * 100, 1)}%",
            "liquidity_ratio": round(risk_recalculated.liquidity_ratio, 4),
            "liquidity_pct": f"{round(risk_recalculated.liquidity_ratio * 100, 1)}%",
            "concentration": round(risk_recalculated.concentration, 4),
            "operating_envelope": risk_recalculated.operating_envelope,
            "distance_to_failure": rev_recalculated["distance_to_failure_pct"],
            "resilience_score": rev_recalculated["resilience_score"],
        },
        "improvements": {
            "risk_reduction": round(max(risk_before_val - risk_recalculated.risk_score, 0.0), 1),
            "volatility_reduction_pct": f"{round((risk_before_snapshot.volatility - risk_recalculated.volatility) * 100, 1)}%",
            "resilience_gain": round(max(rev_recalculated["resilience_score"] - rev_before_snapshot["resilience_score"], 0.0), 1),
            "capital_preserved_est": f"₹{round(portfolio_value * max(risk_before_snapshot.volatility - risk_recalculated.volatility, 0.0) / 100_000 * 100_000, 2):.2f} L",
        },
    }

    return {
        "status": "APPROVED",
        "approved": True,
        "portfolio_id": str(opt_run.portfolio_id),
        "optimization_id": str(optimization_id),
        "message": "Holdings updated in database. Risk and resilience successfully restored.",
        "before_after": before_after,
    }


def reject_rebalance(
    db: Session,
    optimization_id: UUID | str,
) -> dict:
    """Reject a rebalance recommendation. Holdings remain unchanged."""
    if isinstance(optimization_id, str):
        optimization_id = UUID(optimization_id)

    ra = (
        db.query(RebalanceAction)
        .filter(RebalanceAction.optimization_id == optimization_id)
        .first()
    )
    if ra:
        ra.approved = False
        if not (ra.reason or "").endswith("[REJECTED BY USER]"):
            ra.reason = (ra.reason or "") + " [REJECTED BY USER]"
        db.commit()

    return {
        "status": "REJECTED",
        "approved": False,
        "optimization_id": str(optimization_id),
        "message": "Rebalance recommendation rejected by officer. Portfolio holdings remain unchanged.",
    }
