"""Risk snapshot model — persisted risk engine results."""

import uuid
from datetime import datetime

from app.core.time import utcnow

from sqlalchemy import ForeignKey, String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RiskSnapshot(Base):
    __tablename__ = "risk_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("portfolios.id"), nullable=False
    )

    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)

    expected_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    volatility: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[float | None] = mapped_column(Float, nullable=True)
    liquidity_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    concentration: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_stress: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow
    )

    # Relationships
    portfolio = relationship("Portfolio", back_populates="risk_snapshots")
