"""Initial schema — 11 tables.

Revision ID: 001
Revises: None
Create Date: 2024-01-01 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. assets
    op.create_table(
        "assets",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("symbol", sa.String(20), unique=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("expected_return", sa.Float(), nullable=False),
        sa.Column("volatility", sa.Float(), nullable=False),
        sa.Column("liquidity_score", sa.Float(), nullable=False),
        sa.Column("min_weight", sa.Float(), nullable=False, server_default="0"),
        sa.Column("max_weight", sa.Float(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 2. portfolios
    op.create_table(
        "portfolios",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("total_capital", sa.Numeric(18, 2), nullable=False),
        sa.Column("risk_aversion", sa.Float(), server_default="1.0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 3. holdings
    op.create_table(
        "holdings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "portfolio_id", sa.Uuid(),
            sa.ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "asset_id", sa.Uuid(),
            sa.ForeignKey("assets.id"), nullable=False
        ),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("market_value", sa.Numeric(18, 2), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("portfolio_id", "asset_id", name="uq_holding_portfolio_asset"),
    )

    # 4. market_prices
    op.create_table(
        "market_prices",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "asset_id", sa.Uuid(),
            sa.ForeignKey("assets.id"), nullable=False
        ),
        sa.Column("price_date", sa.Date(), nullable=False),
        sa.Column("open_price", sa.Float(), nullable=True),
        sa.Column("high_price", sa.Float(), nullable=True),
        sa.Column("low_price", sa.Float(), nullable=True),
        sa.Column("close_price", sa.Float(), nullable=False),
        sa.UniqueConstraint("asset_id", "price_date", name="uq_market_price_asset_date"),
    )

    # 5. risk_snapshots
    op.create_table(
        "risk_snapshots",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "portfolio_id", sa.Uuid(),
            sa.ForeignKey("portfolios.id"), nullable=False
        ),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("expected_return", sa.Float(), nullable=True),
        sa.Column("volatility", sa.Float(), nullable=True),
        sa.Column("max_drawdown", sa.Float(), nullable=True),
        sa.Column("liquidity_ratio", sa.Float(), nullable=True),
        sa.Column("concentration", sa.Float(), nullable=True),
        sa.Column("market_stress", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 6. optimization_runs
    op.create_table(
        "optimization_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "portfolio_id", sa.Uuid(),
            sa.ForeignKey("portfolios.id"), nullable=False
        ),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("risk_aversion", sa.Float(), nullable=False),
        sa.Column("expected_return_before", sa.Float(), nullable=True),
        sa.Column("volatility_before", sa.Float(), nullable=True),
        sa.Column("expected_return_after", sa.Float(), nullable=True),
        sa.Column("volatility_after", sa.Float(), nullable=True),
        sa.Column("transaction_cost", sa.Numeric(18, 2), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 7. optimization_allocations
    op.create_table(
        "optimization_allocations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "optimization_id", sa.Uuid(),
            sa.ForeignKey("optimization_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "asset_id", sa.Uuid(),
            sa.ForeignKey("assets.id"), nullable=False
        ),
        sa.Column("old_weight", sa.Float(), nullable=False),
        sa.Column("new_weight", sa.Float(), nullable=False),
    )

    # 8. scenarios
    op.create_table(
        "scenarios",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 9. scenario_shocks
    op.create_table(
        "scenario_shocks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "scenario_id", sa.Uuid(),
            sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "asset_id", sa.Uuid(),
            sa.ForeignKey("assets.id"), nullable=False
        ),
        sa.Column("shock_percentage", sa.Float(), nullable=False),
    )

    # 10. alerts
    op.create_table(
        "alerts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "portfolio_id", sa.Uuid(),
            sa.ForeignKey("portfolios.id"), nullable=False
        ),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("metric", sa.String(50), nullable=True),
        sa.Column("metric_value", sa.Float(), nullable=True),
        sa.Column("threshold_value", sa.Float(), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # 11. rebalance_actions
    op.create_table(
        "rebalance_actions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "portfolio_id", sa.Uuid(),
            sa.ForeignKey("portfolios.id"), nullable=False
        ),
        sa.Column(
            "optimization_id", sa.Uuid(),
            sa.ForeignKey("optimization_runs.id"), nullable=True
        ),
        sa.Column("action", sa.String(30), nullable=False),
        sa.Column("approved", sa.Boolean(), server_default="false"),
        sa.Column("transaction_cost", sa.Numeric(18, 2), nullable=True),
        sa.Column("risk_before", sa.Float(), nullable=True),
        sa.Column("risk_after", sa.Float(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("rebalance_actions")
    op.drop_table("alerts")
    op.drop_table("scenario_shocks")
    op.drop_table("scenarios")
    op.drop_table("optimization_allocations")
    op.drop_table("optimization_runs")
    op.drop_table("risk_snapshots")
    op.drop_table("market_prices")
    op.drop_table("holdings")
    op.drop_table("portfolios")
    op.drop_table("assets")
