"""Rebalance action model — audit trail for rebalancing decisions."""

import uuid
from datetime import datetime

from app.core.time import utcnow
from decimal import Decimal

from sqlalchemy import ForeignKey, String, Boolean, Numeric, Float, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RebalanceAction(Base):
    __tablename__ = "rebalance_actions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("portfolios.id"), nullable=False
    )
    optimization_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("optimization_runs.id"), nullable=True
    )

    action: Mapped[str] = mapped_column(String(30), nullable=False)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)

    transaction_cost: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    risk_before: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_after: Mapped[float | None] = mapped_column(Float, nullable=True)

    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow
    )

    # Relationships
    portfolio = relationship("Portfolio", back_populates="rebalance_actions")
    optimization_run = relationship("OptimizationRun")
