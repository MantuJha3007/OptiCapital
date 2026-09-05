"""Market price model — historical daily prices."""

import uuid
from datetime import date

from sqlalchemy import Integer, BigInteger, ForeignKey, Date, Float, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MarketPrice(Base):
    __tablename__ = "market_prices"

    id: Mapped[int] = mapped_column(
        Integer().with_variant(BigInteger, "postgresql"), primary_key=True, autoincrement=True
    )

    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id"), nullable=False
    )

    price_date: Mapped[date] = mapped_column(Date, nullable=False)

    open_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    high_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    low_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    close_price: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("asset_id", "price_date", name="uq_market_price_asset_date"),
    )

    # Relationships
    asset = relationship("Asset", back_populates="market_prices")
