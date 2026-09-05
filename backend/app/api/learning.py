"""Audit & Decision Outcomes Learning API."""

from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.learning_service import get_decision_outcomes

router = APIRouter()


@router.get("/audit/outcomes")
def get_audit_outcomes(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """Retrieve audit history and evaluated subsequent market outcomes."""
    return get_decision_outcomes(db)
