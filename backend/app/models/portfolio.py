"""Portfolio model."""

import uuid
from datetime import datetime
from decimal import Decimal

from app.core.time import utcnow

from sqlalchemy import String, Numeric, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    total_capital: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )

    risk_aversion: Mapped[float] = mapped_column(Float, default=1.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    # Relationships
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")
    risk_snapshots = relationship("RiskSnapshot", back_populates="portfolio")
    optimization_runs = relationship("OptimizationRun", back_populates="portfolio")
    alerts = relationship("Alert", back_populates="portfolio")
    rebalance_actions = relationship("RebalanceAction", back_populates="portfolio")
