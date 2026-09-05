"""Seed database with demo data.

Creates:
- 5 assets with specified characteristics
- 1 demo portfolio (₹1,00,00,000)
- 5 holdings (45/25/15/10/5%)
- 250 days × 5 assets of correlated synthetic market data
- 3 scenarios with shocks

Idempotent — safe to re-run.

Usage:
    cd backend
    python -m app.seed.seed_database
"""

import argparse
import uuid
from datetime import date, timedelta
from decimal import Decimal

import numpy as np
from sqlalchemy.orm import Session

from app.database import engine, Base, SessionLocal
from app.models.asset import Asset
from app.models.portfolio import Portfolio
from app.models.holding import Holding
from app.models.market_data import MarketPrice
from app.models.scenario import Scenario, ScenarioShock
from app.models.alert import Alert
from app.models.rebalance import RebalanceAction
from app.models.risk_snapshot import RiskSnapshot
from app.models.optimization import OptimizationRun, OptimizationAllocation


# ──────────────────────────────────────────────
# Asset definitions
# ──────────────────────────────────────────────
ASSETS = [
    {
        "symbol": "EQUITY",
        "name": "Equity",
        "category": "EQUITY",
        "expected_return": 0.12,
        "volatility": 0.22,
        "liquidity_score": 0.90,
        "min_weight": 0.0,
        "max_weight": 0.50,
    },
    {
        "symbol": "GOV_BONDS",
        "name": "Government Bonds",
        "category": "BONDS",
        "expected_return": 0.07,
        "volatility": 0.06,
        "liquidity_score": 0.95,
        "min_weight": 0.0,
        "max_weight": 1.0,
    },
    {
        "symbol": "CORP_BONDS",
        "name": "Corporate Bonds",
        "category": "BONDS",
        "expected_return": 0.09,
        "volatility": 0.10,
        "liquidity_score": 0.70,
        "min_weight": 0.0,
        "max_weight": 0.30,
    },
    {
        "symbol": "GOLD",
        "name": "Gold",
        "category": "COMMODITY",
        "expected_return": 0.08,
        "volatility": 0.15,
        "liquidity_score": 0.85,
        "min_weight": 0.0,
        "max_weight": 0.20,
    },
    {
        "symbol": "CASH",
        "name": "Cash",
        "category": "CASH",
        "expected_return": 0.04,
        "volatility": 0.01,
        "liquidity_score": 1.00,
        "min_weight": 0.05,
        "max_weight": 1.0,
    },
]

# The demo book has to start comfortably INSIDE its own envelope, because the
# product's central claim is that the correct action is usually no action. The
# original 45/25/15/10/5 split sat exactly on two SAFE limits — HHI of 0.300
# against a 0.300 ceiling and 5% cash against a 10% floor — so the engine
# reported breaches at rest and even a benign scenario produced a rebalance.
# This split gives HHI 0.254 and clears the cash floor, leaving the crash
# scenarios to create the contrast.
HOLDINGS_WEIGHTS = {
    "EQUITY": 0.37,
    "GOV_BONDS": 0.27,
    "CORP_BONDS": 0.15,
    "GOLD": 0.10,
    "CASH": 0.11,
}

PORTFOLIO_CAPITAL = Decimal("10000000.00")  # ₹1 Crore

# ──────────────────────────────────────────────
# Scenario definitions
# ──────────────────────────────────────────────
SCENARIOS = [
    {
        "name": "Normal Market",
        "description": "Business-as-usual conditions with minor fluctuations.",
        "shocks": {
            "EQUITY": 0.02,
            "GOV_BONDS": 0.01,
            "CORP_BONDS": 0.01,
            "GOLD": 0.01,
            "CASH": 0.0,
        },
    },
    {
        "name": "Market Crash",
        "description": "Severe equity decline with flight to safety.",
        "shocks": {
            "EQUITY": -0.38,
            "GOV_BONDS": -0.04,
            "CORP_BONDS": -0.14,
            "GOLD": 0.10,
            "CASH": 0.0,
        },
    },
    {
        # The control engine defines four regimes, so at least one scenario has
        # to be severe enough to exercise the upper bands. A systemic event is
        # also the case where gold stops hedging and is sold for liquidity,
        # which is precisely when correlation convergence hurts most.
        "name": "Systemic Crisis",
        "description": "Correlated selloff across risk assets; gold sold for liquidity.",
        "shocks": {
            "EQUITY": -0.50,
            "GOV_BONDS": -0.08,
            "CORP_BONDS": -0.25,
            "GOLD": 0.04,
            "CASH": 0.0,
        },
    },
    {
        "name": "Inflation Shock",
        "description": "Rising inflation erodes bond values; gold benefits.",
        "shocks": {
            "EQUITY": -0.10,
            "GOV_BONDS": -0.15,
            "CORP_BONDS": -0.08,
            "GOLD": 0.15,
            "CASH": 0.0,
        },
    },
]


def generate_correlated_prices(
    n_days: int = 250,
    seed: int = 42,
) -> dict[str, np.ndarray]:
    """Generate synthetic correlated daily prices for all assets.

    Uses a Cholesky decomposition of a correlation matrix to produce
    realistic correlated returns, then converts to prices.
    """
    rng = np.random.default_rng(seed)

    # Daily parameters (annualised / 252)
    daily_returns = {
        "EQUITY": 0.12 / 252,
        "GOV_BONDS": 0.07 / 252,
        "CORP_BONDS": 0.09 / 252,
        "GOLD": 0.08 / 252,
        "CASH": 0.04 / 252,
    }
    daily_vols = {
        "EQUITY": 0.22 / np.sqrt(252),
        "GOV_BONDS": 0.06 / np.sqrt(252),
        "CORP_BONDS": 0.10 / np.sqrt(252),
        "GOLD": 0.15 / np.sqrt(252),
        "CASH": 0.01 / np.sqrt(252),
    }

    # Correlation matrix
    # Equity-Bonds moderate positive, Equity-Gold low/negative, Gold-Bonds low
    symbols = ["EQUITY", "GOV_BONDS", "CORP_BONDS", "GOLD", "CASH"]
    corr = np.array([
        [1.00,  0.20,  0.40, -0.10, 0.00],  # EQUITY
        [0.20,  1.00,  0.60, -0.05, 0.00],  # GOV_BONDS
        [0.40,  0.60,  1.00,  0.00, 0.00],  # CORP_BONDS
        [-0.10, -0.05, 0.00,  1.00, 0.00],  # GOLD
        [0.00,  0.00,  0.00,  0.00, 1.00],  # CASH
    ])

    # Build covariance matrix
    vols = np.array([daily_vols[s] for s in symbols])
    cov = np.outer(vols, vols) * corr

    # Cholesky
    L = np.linalg.cholesky(cov)

    # Generate correlated daily returns
    z = rng.standard_normal((n_days, len(symbols)))
    daily_rets = z @ L.T

    # Add drift
    means = np.array([daily_returns[s] for s in symbols])
    daily_rets += means

    # Convert to prices (starting at 100)
    prices = {}
    for i, symbol in enumerate(symbols):
        cumulative = np.cumprod(1 + daily_rets[:, i])
        prices[symbol] = 100.0 * cumulative

    return prices


def seed_all(db: Session) -> None:
    """Seed all demo data. Idempotent."""
    print("Seeding database...")

    # --- Assets ---
    asset_map: dict[str, Asset] = {}
    for asset_def in ASSETS:
        existing = db.query(Asset).filter(Asset.symbol == asset_def["symbol"]).first()
        if existing:
            asset_map[asset_def["symbol"]] = existing
            print(f"  Asset {asset_def['symbol']} already exists.")
        else:
            asset = Asset(id=uuid.uuid4(), **asset_def)
            db.add(asset)
            asset_map[asset_def["symbol"]] = asset
            print(f"  Created asset: {asset_def['symbol']}")
    db.flush()

    # --- Portfolio ---
    existing_portfolio = db.query(Portfolio).first()
    if existing_portfolio:
        portfolio = existing_portfolio
        print(f"  Portfolio already exists: {portfolio.name}")
    else:
        portfolio = Portfolio(
            id=uuid.uuid4(),
            name="Smart Capital Demo Portfolio",
            total_capital=PORTFOLIO_CAPITAL,
            risk_aversion=1.0,
        )
        db.add(portfolio)
        db.flush()
        print(f"  Created portfolio: {portfolio.name}")

    # --- Holdings ---
    for symbol, weight in HOLDINGS_WEIGHTS.items():
        asset = asset_map[symbol]
        existing = (
            db.query(Holding)
            .filter(Holding.portfolio_id == portfolio.id, Holding.asset_id == asset.id)
            .first()
        )
        if existing:
            print(f"  Holding {symbol} already exists.")
        else:
            holding = Holding(
                id=uuid.uuid4(),
                portfolio_id=portfolio.id,
                asset_id=asset.id,
                weight=weight,
                market_value=Decimal(str(round(weight * float(PORTFOLIO_CAPITAL), 2))),
            )
            db.add(holding)
            print(f"  Created holding: {symbol} = {weight:.0%}")
    db.flush()

    # --- Historical prices ---
    existing_prices = db.query(MarketPrice).count()
    if existing_prices > 0:
        print(f"  Market prices already exist ({existing_prices} rows).")
    else:
        prices = generate_correlated_prices(n_days=250)
        start_date = date(2024, 1, 2)  # First trading day

        for symbol, price_array in prices.items():
            asset = asset_map[symbol]
            for day_idx in range(len(price_array)):
                price_date = start_date + timedelta(days=day_idx)
                # Skip weekends
                while price_date.weekday() >= 5:
                    price_date += timedelta(days=1)

                close = float(price_array[day_idx])
                # Simple OHLC simulation
                spread = close * 0.005  # 0.5% spread
                mp = MarketPrice(
                    asset_id=asset.id,
                    price_date=price_date + timedelta(days=day_idx),
                    open_price=close - spread,
                    high_price=close + spread * 1.5,
                    low_price=close - spread * 1.5,
                    close_price=close,
                )
                db.add(mp)

        print(f"  Created {250 * 5} market price records.")
    db.flush()

    # --- Scenarios ---
    for scenario_def in SCENARIOS:
        existing = db.query(Scenario).filter(Scenario.name == scenario_def["name"]).first()
        if existing:
            print(f"  Scenario '{scenario_def['name']}' already exists.")
        else:
            scenario = Scenario(
                id=uuid.uuid4(),
                name=scenario_def["name"],
                description=scenario_def["description"],
            )
            db.add(scenario)
            db.flush()

            for symbol, shock_pct in scenario_def["shocks"].items():
                shock = ScenarioShock(
                    id=uuid.uuid4(),
                    scenario_id=scenario.id,
                    asset_id=asset_map[symbol].id,
                    shock_percentage=shock_pct,
                )
                db.add(shock)

            print(f"  Created scenario: {scenario_def['name']}")

    db.commit()
    print("\nSeeding complete!")


def reset_all(db: Session) -> None:
    """Drop every row and re-seed from scratch.

    Approving a crisis rebalance rewrites the holdings, which is the whole
    point — but it also means the demo book stays defensive afterwards and the
    walkthrough cannot be repeated. This restores the starting state without
    touching the schema or requiring the database to be recreated.
    """
    print("Resetting demo data...")
    # Children before parents; the ORM classes carry the FK graph.
    for model in (
        RebalanceAction,
        OptimizationAllocation,
        OptimizationRun,
        Alert,
        RiskSnapshot,
        ScenarioShock,
        Scenario,
        MarketPrice,
        Holding,
        Portfolio,
        Asset,
    ):
        deleted = db.query(model).delete()
        if deleted:
            print(f"  Cleared {deleted} rows from {model.__tablename__}")
    db.commit()


def main() -> None:
    """Entry point for seeding.

    Usage:
        python -m app.seed.seed_database            # idempotent seed
        python -m app.seed.seed_database --reset    # wipe, then seed
    """
    parser = argparse.ArgumentParser(description="Seed the OptiCapital demo data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="delete existing rows first, restoring the original demo book",
    )
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if args.reset:
            reset_all(db)
        seed_all(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
