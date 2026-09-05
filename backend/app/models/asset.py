"""Asset model — financial instruments."""

import uuid
from datetime import datetime

from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    symbol: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)

    expected_return: Mapped[float] = mapped_column(Float, nullable=False)
    volatility: Mapped[float] = mapped_column(Float, nullable=False)
    liquidity_score: Mapped[float] = mapped_column(Float, nullable=False)

    min_weight: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    max_weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Relationships
    holdings = relationship("Holding", back_populates="asset")
    market_prices = relationship("MarketPrice", back_populates="asset")
