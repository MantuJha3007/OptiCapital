"""AI Risk Manager Copilot Chat & Context APIs for AEGIS."""

import time
import logging
from typing import Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.portfolio_service import get_default_portfolio
from app.services.copilot_service import get_copilot_assessment, get_copilot_context_payload

logger = logging.getLogger(__name__)

router = APIRouter()


class MessageHistoryItem(BaseModel):
    role: str
    content: str


class CopilotChatRequest(BaseModel):
    query: str | None = None
    screen_context: Any = Field(default="COMMAND_CENTER")
    conversation_history: list[dict[str, str]] | None = None


@router.post("/risk-manager/chat")
@router.post("/copilot/chat")
def post_copilot_chat(
    payload: CopilotChatRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Chat with the AEGIS Copilot, grounded in live facts, screen context & RAG evidence."""
    t_start = time.perf_counter()
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    res = get_copilot_assessment(
        db,
        portfolio,
        user_query=payload.query,
        screen_context=payload.screen_context,
        conversation_history=payload.conversation_history,
    )

    t_elapsed = round((time.perf_counter() - t_start) * 1000, 2)
    logger.info(
        f"[Copilot] Query: '{payload.query}' | Intent: {res.get('intent')} | "
        f"Tools: {res.get('tool_calls')} | Latency: {t_elapsed}ms"
    )

    res["latency_ms"] = t_elapsed
    return res


@router.get("/copilot/context")
def get_copilot_context(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve aggregated read-only institutional, risk, and policy context for Copilot."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")

    return get_copilot_context_payload(db, portfolio)
