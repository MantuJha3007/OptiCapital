"""Portfolio service — loads portfolio state from PostgreSQL."""

from uuid import UUID

import numpy as np
from sqlalchemy.orm import Session, joinedload

from app.models.portfolio import Portfolio
from app.models.holding import Holding
from app.models.asset import Asset


def get_default_portfolio(db: Session) -> Portfolio | None:
    """Get the first (demo) portfolio with holdings and assets eagerly loaded."""
    return (
        db.query(Portfolio)
        .options(
            joinedload(Portfolio.holdings).joinedload(Holding.asset)
        )
        .first()
    )


def get_portfolio_by_id(db: Session, portfolio_id: UUID) -> Portfolio | None:
    """Get a specific portfolio by ID."""
    return (
        db.query(Portfolio)
        .options(
            joinedload(Portfolio.holdings).joinedload(Holding.asset)
        )
        .filter(Portfolio.id == portfolio_id)
        .first()
    )


def get_holdings_data(portfolio: Portfolio) -> tuple[
    list[str], np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray
]:
    """Extract arrays from portfolio holdings.

    Returns:
        asset_ids: list of asset UUID strings (ordered)
        weights: current weight array
        expected_returns: per-asset expected returns
        volatilities: per-asset volatilities
        liquidity_scores: per-asset liquidity scores
        max_weights: per-asset max weight constraints
    """
    holdings = sorted(portfolio.holdings, key=lambda h: h.asset.symbol)

    asset_ids = [str(h.asset_id) for h in holdings]
    weights = np.array([h.weight for h in holdings])
    expected_returns = np.array([h.asset.expected_return for h in holdings])
    volatilities = np.array([h.asset.volatility for h in holdings])
    liquidity_scores = np.array([h.asset.liquidity_score for h in holdings])
    max_weights = np.array([h.asset.max_weight for h in holdings])

    return asset_ids, weights, expected_returns, volatilities, liquidity_scores, max_weights


def get_asset_symbols(portfolio: Portfolio) -> list[str]:
    """Get ordered list of asset symbols."""
    holdings = sorted(portfolio.holdings, key=lambda h: h.asset.symbol)
    return [h.asset.symbol for h in holdings]


def get_asset_names(portfolio: Portfolio) -> list[str]:
    """Get ordered list of asset names."""
    holdings = sorted(portfolio.holdings, key=lambda h: h.asset.symbol)
    return [h.asset.name for h in holdings]


def get_assets_ordered(portfolio: Portfolio) -> list[Asset]:
    """Get ordered list of Asset objects."""
    holdings = sorted(portfolio.holdings, key=lambda h: h.asset.symbol)
    return [h.asset for h in holdings]
