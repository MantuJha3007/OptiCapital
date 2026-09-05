"""Holding model — current portfolio allocations."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Float, Numeric, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id"), nullable=False
    )

    weight: Mapped[float] = mapped_column(Float, nullable=False)
    market_value: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint("portfolio_id", "asset_id", name="uq_holding_portfolio_asset"),
    )

    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")
    asset = relationship("Asset", back_populates="holdings")
