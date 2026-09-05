"""Market Intelligence APIs: Regime AI, Correlation Contagion, and Market Data Feeds."""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.portfolio_service import get_default_portfolio
from app.services.regime_service import detect_market_regime
from app.services.contagion_service import compute_correlation_contagion
from app.services.market_data import (
    get_market_data_provider,
    set_market_data_provider,
    register_csv_provider,
    get_market_data_status,
)
from app.services.market_data.csv_provider import CSVMarketDataProvider

router = APIRouter()


class SwitchProviderRequest(BaseModel):
    provider: str


@router.get("/market/regime")
def get_market_regime(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Get real-time market regime classification (CALM, TRANSITION, CRISIS)."""
    return detect_market_regime(db)


@router.get("/market/contagion")
def get_market_contagion(
    is_stressed: bool = False,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Get correlation contagion lens and risk cluster analysis."""
    portfolio = get_default_portfolio(db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="No portfolio found.")
    return compute_correlation_contagion(db, portfolio, is_stressed=is_stressed)


@router.get("/market/provider")
def get_provider_status() -> dict[str, Any]:
    """Get current active market provider and status."""
    return get_market_data_status()


@router.post("/market/provider")
def switch_provider(payload: SwitchProviderRequest) -> dict[str, Any]:
    """Switch active market data provider (demo, csv, live)."""
    prov_name = payload.provider.lower().strip()
    try:
        set_market_data_provider(prov_name)  # type: ignore
        return {
            "status": "SUCCESS",
            "message": f"Market data provider switched to {prov_name.upper()}",
            "active_provider": prov_name,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/market/upload-csv")
async def upload_market_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Upload historical price CSV, activate CSV provider, and persist prices to database.

    This ensures the risk engine (which reads from MarketPrice table)
    uses the uploaded data for covariance / returns calculations.
    """
    content = await file.read()
    try:
        provider = CSVMarketDataProvider(csv_content=content, filename=file.filename or "uploaded_market_data.csv")
        register_csv_provider(provider)

        # Persist to MarketPrice table so risk engine picks up the data
        db_result = provider.persist_to_database(db)

        return {
            "status": "SUCCESS",
            "message": f"Uploaded {file.filename} with {len(provider.prices_df)} observations. {db_result['prices_written']} prices written to database.",
            "metadata": provider.get_metadata(),
            "database": db_result,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")


@router.get("/market/history")
def get_market_history(lookback_days: int = 60) -> dict[str, Any]:
    """Get historical prices and returns for active provider."""
    provider = get_market_data_provider()
    prices_df = provider.get_prices(lookback_days=lookback_days)
    returns_df = provider.get_returns(lookback_days=lookback_days)
    vols = provider.get_volatility()

    series = []
    for dt, row in prices_df.iterrows():
        entry = {"date": str(dt)[:10]}
        for col in prices_df.columns:
            entry[col] = round(float(row[col]), 2)
        series.append(entry)

    return {
        "provider": provider.get_metadata().get("provider", "DEMO"),
        "observations": len(series),
        "volatilities": vols,
        "prices": series,
    }
