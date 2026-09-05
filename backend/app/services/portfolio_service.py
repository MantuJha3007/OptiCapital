import uuid
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timezone

import numpy as np
from sqlalchemy.orm import Session, joinedload

from app.models.portfolio import Portfolio
from app.models.holding import Holding
from app.models.asset import Asset
from app.schemas.portfolio import CustomPortfolioInput


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


def update_custom_portfolio(db: Session, data: CustomPortfolioInput):
    """Update or create portfolio with custom corporate capital and holdings."""
    from app.services.risk_engine import calculate_risk, save_risk_snapshot

    portfolio = get_default_portfolio(db)
    total_capital_dec = Decimal(str(round(data.total_capital, 2)))

    if not portfolio:
        portfolio = Portfolio(
            id=uuid.uuid4(),
            name=data.name,
            total_capital=total_capital_dec,
            risk_aversion=data.risk_aversion,
        )
        db.add(portfolio)
        db.flush()
    else:
        portfolio.name = data.name
        portfolio.total_capital = total_capital_dec
        portfolio.risk_aversion = data.risk_aversion
        portfolio.updated_at = datetime.now(timezone.utc)

    # Query all assets
    assets = db.query(Asset).all()
    asset_by_symbol = {a.symbol.upper(): a for a in assets}

    # Validate all incoming symbols
    for h in data.holdings:
        sym = h.symbol.upper()
        if sym not in asset_by_symbol:
            raise ValueError(f"Unknown asset symbol: '{h.symbol}'. Available: {list(asset_by_symbol.keys())}")

    # Map existing holdings by asset_id
    existing_holdings = {h.asset_id: h for h in portfolio.holdings}

    # Zero out holdings not present in custom input
    submitted_symbols = {h.symbol.upper() for h in data.holdings}
    for asset_id, holding in existing_holdings.items():
        if holding.asset and holding.asset.symbol.upper() not in submitted_symbols:
            holding.weight = 0.0
            holding.market_value = Decimal("0.00")
            holding.updated_at = datetime.now(timezone.utc)

    # Update or insert holdings
    for h in data.holdings:
        asset = asset_by_symbol[h.symbol.upper()]
        market_val = Decimal(str(round(h.weight * data.total_capital, 2)))

        if asset.id in existing_holdings:
            holding = existing_holdings[asset.id]
            holding.weight = float(h.weight)
            holding.market_value = market_val
            holding.updated_at = datetime.now(timezone.utc)
        else:
            new_holding = Holding(
                id=uuid.uuid4(),
                portfolio_id=portfolio.id,
                asset_id=asset.id,
                weight=float(h.weight),
                market_value=market_val,
            )
            db.add(new_holding)

    db.commit()

    # Reload portfolio with joinedload for holdings and asset
    portfolio = (
        db.query(Portfolio)
        .options(joinedload(Portfolio.holdings).joinedload(Holding.asset))
        .filter(Portfolio.id == portfolio.id)
        .first()
    )

    # Re-calculate risk snapshot on the new portfolio
    risk_result = calculate_risk(db, portfolio)
    snapshot = save_risk_snapshot(db, portfolio.id, risk_result)

    return portfolio, risk_result, snapshot
