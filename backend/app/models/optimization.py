"""Optimization models — runs and per-asset allocations."""

import uuid
from datetime import datetime
from decimal import Decimal

from app.core.time import utcnow

from sqlalchemy import ForeignKey, String, Float, Numeric, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("portfolios.id"), nullable=False
    )

    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    risk_aversion: Mapped[float] = mapped_column(Float, nullable=False)

    expected_return_before: Mapped[float | None] = mapped_column(Float, nullable=True)
    volatility_before: Mapped[float | None] = mapped_column(Float, nullable=True)

    expected_return_after: Mapped[float | None] = mapped_column(Float, nullable=True)
    volatility_after: Mapped[float | None] = mapped_column(Float, nullable=True)

    transaction_cost: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    status: Mapped[str] = mapped_column(String(30), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow
    )

    # Relationships
    portfolio = relationship("Portfolio", back_populates="optimization_runs")
    allocations = relationship(
        "OptimizationAllocation",
        back_populates="optimization_run",
        cascade="all, delete-orphan",
    )


class OptimizationAllocation(Base):
    __tablename__ = "optimization_allocations"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    optimization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("optimization_runs.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id"), nullable=False
    )

    old_weight: Mapped[float] = mapped_column(Float, nullable=False)
    new_weight: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    optimization_run = relationship("OptimizationRun", back_populates="allocations")
    asset = relationship("Asset")
