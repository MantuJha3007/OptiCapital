"""Scenario models — scenario definitions and per-asset shocks."""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Relationships
    shocks = relationship(
        "ScenarioShock",
        back_populates="scenario",
        cascade="all, delete-orphan",
    )


class ScenarioShock(Base):
    __tablename__ = "scenario_shocks"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )

    scenario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id"), nullable=False
    )

    shock_percentage: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    scenario = relationship("Scenario", back_populates="shocks")
    asset = relationship("Asset")
