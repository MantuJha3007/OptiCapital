"""Rebalance API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.rebalance import RebalanceRequest, RebalanceResponse
from app.services.rebalancer import approve_rebalance, reject_rebalance
from app.models.rebalance import RebalanceAction

router = APIRouter()


@router.post("/rebalance")
def handle_rebalance(
    request: RebalanceRequest,
    db: Session = Depends(get_db),
):
    """Approve or reject a rebalance recommendation.

    If approved: updates simulated holdings in PostgreSQL and creates audit record.
    If rejected: marks the recommendation as rejected.
    """
    if request.approved:
        result = approve_rebalance(db, request.optimization_id)
    else:
        result = reject_rebalance(db, request.optimization_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.get("/rebalance/history")
def rebalance_history(db: Session = Depends(get_db)):
    """Get recent rebalance actions for audit display."""
    actions = (
        db.query(RebalanceAction)
        .order_by(RebalanceAction.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": str(a.id),
            "action": a.action,
            "approved": a.approved,
            "transaction_cost": float(a.transaction_cost) if a.transaction_cost else None,
            "risk_before": a.risk_before,
            "risk_after": a.risk_after,
            "reason": a.reason,
            "created_at": a.created_at.isoformat(),
        }
        for a in actions
    ]
