"""CSV Market Data Provider — parses, validates, and serves user-uploaded market data."""

import io
from typing import Any
import numpy as np
import pandas as pd

from app.services.market_data.base import MarketDataProvider
from app.core.constants import TRADING_DAYS_PER_YEAR


class CSVMarketDataProvider(MarketDataProvider):
    """Processes historical price time series from user-provided CSV."""

    def __init__(self, csv_content: str | bytes | None = None, filename: str = "uploaded_prices.csv"):
        self.filename = filename
        self.prices_df = pd.DataFrame()
        self.symbols: list[str] = []
        if csv_content:
            self.load_from_csv(csv_content)

    def load_from_csv(self, csv_content: str | bytes) -> dict[str, Any]:
        """Parse, validate, and load CSV data."""
        if isinstance(csv_content, bytes):
            stream = io.BytesIO(csv_content)
        else:
            stream = io.StringIO(csv_content)

        df = pd.read_csv(stream)

        # Look for date column
        date_col = None
        for col in df.columns:
            if col.lower() in ("date", "timestamp", "time", "day"):
                date_col = col
                break

        if date_col:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
            df = df.dropna(subset=[date_col]).sort_values(by=date_col)
            df.set_index(date_col, inplace=True)
        else:
            # Fallback index
            df.index = pd.date_range(end=pd.Timestamp.today(), periods=len(df), freq="B")

        # Keep only numeric columns
        numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        if not numeric_cols:
            raise ValueError("CSV contains no numeric price columns.")

        cleaned_df = df[numeric_cols].ffill().bfill().dropna()
        if cleaned_df.empty:
            raise ValueError("CSV contains no valid price rows after cleaning.")

        self.prices_df = cleaned_df
        self.symbols = list(self.prices_df.columns)

        return {
            "status": "LOADED",
            "filename": self.filename,
            "observations": len(self.prices_df),
            "symbols": self.symbols,
            "date_range": [str(self.prices_df.index.min().date()), str(self.prices_df.index.max().date())],
        }

    def get_prices(self, symbols: list[str] | None = None, lookback_days: int = 250) -> pd.DataFrame:
        df = self.prices_df.tail(lookback_days)
        if symbols:
            valid_cols = [s for s in symbols if s in df.columns]
            return df[valid_cols] if valid_cols else df
        return df

    def get_returns(self, symbols: list[str] | None = None, lookback_days: int = 250) -> pd.DataFrame:
        prices = self.get_prices(symbols=symbols, lookback_days=lookback_days)
        return prices.pct_change().dropna()

    def get_market_index(self, lookback_days: int = 250) -> pd.Series:
        rets = self.get_returns(lookback_days=lookback_days)
        if rets.empty:
            return pd.Series(dtype=float)
        # Equal-weighted return across all available symbols as market proxy
        return rets.mean(axis=1)

    def get_volatility(self, symbols: list[str] | None = None) -> dict[str, float]:
        rets = self.get_returns(symbols=symbols)
        vols = rets.std() * np.sqrt(TRADING_DAYS_PER_YEAR)
        return {str(k): round(float(v), 4) for k, v in vols.items()}

    def get_metadata(self) -> dict[str, Any]:
        return {
            "provider": "CSV",
            "filename": self.filename,
            "status": "LOADED" if not self.prices_df.empty else "EMPTY",
            "asset_count": len(self.symbols),
            "observations": len(self.prices_df),
            "symbols": self.symbols,
            "offline_ready": True,
        }

    def persist_to_database(self, db: "Session") -> dict[str, Any]:
        """Write parsed CSV price data into the MarketPrice database table.

        Resolves CSV column names to asset IDs via the Asset table,
        then upserts daily close prices. This bridges the CSV provider
        with the risk engine which reads from MarketPrice.
        """
        from app.models.asset import Asset
        from app.models.market_data import MarketPrice
        from sqlalchemy.dialects.sqlite import insert as sqlite_insert

        # Resolve CSV column symbols to asset IDs
        assets = db.query(Asset).filter(Asset.symbol.in_(self.symbols)).all()
        symbol_to_id = {a.symbol: a.id for a in assets}

        inserted = 0
        skipped_symbols = []

        for col_name in self.symbols:
            # Try exact match, then uppercase
            asset_id = symbol_to_id.get(col_name) or symbol_to_id.get(col_name.upper())
            if not asset_id:
                skipped_symbols.append(col_name)
                continue

            for idx, row in self.prices_df[[col_name]].iterrows():
                price_date = idx.date() if hasattr(idx, 'date') else idx
                close_val = float(row[col_name])

                # Check if record exists
                existing = (
                    db.query(MarketPrice)
                    .filter(MarketPrice.asset_id == asset_id, MarketPrice.price_date == price_date)
                    .first()
                )
                if existing:
                    existing.close_price = close_val
                else:
                    mp = MarketPrice(
                        asset_id=asset_id,
                        price_date=price_date,
                        close_price=close_val,
                    )
                    db.add(mp)
                    inserted += 1

        db.commit()

        return {
            "prices_written": inserted,
            "skipped_symbols": skipped_symbols,
            "matched_symbols": [s for s in self.symbols if s in symbol_to_id or s.upper() in symbol_to_id],
        }

