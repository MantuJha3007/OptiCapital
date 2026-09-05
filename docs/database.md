# AEGIS Database Architecture & Schema Specification

**Database Engine:** PostgreSQL 16  
**ORM:** SQLAlchemy 2.0  
**Migration Tool:** Alembic  
**Seeding Script:** [`backend/app/seed/seed_database.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/seed/seed_database.py)  

---

## 1. Schema Overview

The database stores the full lifecycle of capital monitoring, risk assessment, optimizer runs, and human approval events across **11 normalized tables**.

```text
 ┌───────────────┐        ┌───────────────┐        ┌──────────────────┐
 │    assets     │◄───────┤   holdings    │───────►│    portfolios    │
 └───────┬───────┘        └───────────────┘        └────────┬─────────┘
         │                                                  │
         │                ┌───────────────┐                 ├──────────────────────────┐
         ├───────────────►│ market_prices │                 │                          │
         │                └───────────────┘                 ▼                          ▼
         │                                       ┌────────────────────┐      ┌──────────────────┐
         │        ┌───────────────────────┐      │   risk_snapshots   │      │ optimization_runs│
         ├───────►│    scenario_shocks    │      └────────────────────┘      └────────┬─────────┘
         │        └───────────▲───────────┘                                           │
         │                    │                                                       ▼
         │        ┌───────────┴───────────┐      ┌────────────────────┐      ┌──────────────────┐
         │        │       scenarios       │      │ rebalance_actions  │◄─────┤   optimization   │
         │        └───────────────────────┘      └────────────────────┘      │   allocations    │
         │                                                                   └──────────────────┘
         │        ┌───────────────────────┐
         └───────►│        alerts         │
                  └───────────────────────┘
```

---

## 2. Table Definitions

### 2.1 `assets`
Defines institutional investment instruments and their baseline risk parameters.
- `id` (UUID, Primary Key)
- `symbol` (VARCHAR 20, Unique, Indexed) — e.g., `EQUITY`, `GOV_BONDS`, `CORP_BONDS`, `GOLD`, `CASH`
- `name` (VARCHAR 100)
- `category` (VARCHAR 50) — `EQUITY`, `BONDS`, `COMMODITY`, `CASH`
- `expected_return` (FLOAT) — Annualized expected return
- `volatility` (FLOAT) — Annualized historical volatility
- `liquidity_score` (FLOAT) — Normalized liquidity index $[0.0, 1.0]$
- `min_weight` (FLOAT) — Mandate lower allocation bound
- `max_weight` (FLOAT) — Mandate upper allocation bound

### 2.2 `portfolios`
Represents managed institutional capital entities.
- `id` (UUID, Primary Key)
- `name` (VARCHAR 100)
- `total_capital` (NUMERIC 15,2) — Total fund valuation (default: ₹1,00,00,000 / ₹1 Crore)
- `risk_aversion` (FLOAT) — Risk aversion coefficient $\lambda$
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 2.3 `holdings`
Active portfolio composition and market valuations.
- `id` (UUID, Primary Key)
- `portfolio_id` (UUID, Foreign Key $\to$ `portfolios.id`)
- `asset_id` (UUID, Foreign Key $\to$ `assets.id`)
- `weight` (FLOAT) — Capital allocation weight $\in [0, 1]$
- `market_value` (NUMERIC 15,2) — Valuation in INR
- `updated_at` (TIMESTAMP)

### 2.4 `market_prices`
Daily OHLC market price history used to construct return series and covariance matrices.
- `id` (UUID, Primary Key)
- `asset_id` (UUID, Foreign Key $\to$ `assets.id`)
- `price_date` (DATE, Indexed)
- `open_price` (FLOAT)
- `high_price` (FLOAT)
- `low_price` (FLOAT)
- `close_price` (FLOAT)
- `volume` (BIGINT)

### 2.5 `risk_snapshots`
Immutable audit log of all computed risk evaluations.
- `id` (UUID, Primary Key)
- `portfolio_id` (UUID, Foreign Key $\to$ `portfolios.id`)
- `risk_score` (FLOAT) — Normalized composite score $0–100$
- `risk_level` (VARCHAR 20) — `SAFE`, `WARNING`, `STRESS`, `CRISIS`
- `expected_return` (FLOAT)
- `volatility` (FLOAT)
- `max_drawdown` (FLOAT)
- `liquidity_ratio` (FLOAT)
- `concentration` (FLOAT) — Herfindahl-Hirschman Index
- `market_stress` (FLOAT)
- `created_at` (TIMESTAMP)

### 2.6 `optimization_runs`
Audit records of CVXPY optimization invocations.
- `id` (UUID, Primary Key)
- `portfolio_id` (UUID, Foreign Key $\to$ `portfolios.id`)
- `risk_level` (VARCHAR 20)
- `risk_aversion` (FLOAT)
- `expected_return_before` (FLOAT)
- `volatility_before` (FLOAT)
- `expected_return_after` (FLOAT)
- `volatility_after` (FLOAT)
- `transaction_cost` (NUMERIC 15,2) — Total estimated trading friction
- `status` (VARCHAR 50) — `OPTIMAL`, `FEASIBLE_FALLBACK`, `FAILED`
- `created_at` (TIMESTAMP)

### 2.7 `optimization_allocations`
Per-asset weight transitions for each optimization run.
- `id` (UUID, Primary Key)
- `optimization_id` (UUID, Foreign Key $\to$ `optimization_runs.id`)
- `asset_id` (UUID, Foreign Key $\to$ `assets.id`)
- `old_weight` (FLOAT)
- `new_weight` (FLOAT)

### 2.8 `scenarios`
Predefined macroeconomic and financial stress scenario definitions.
- `id` (UUID, Primary Key)
- `name` (VARCHAR 100) — e.g., `Normal Market`, `Market Crash`, `High Inflation`
- `description` (TEXT)
- `created_at` (TIMESTAMP)

### 2.9 `scenario_shocks`
Asset-specific shock magnitudes linked to scenarios.
- `id` (UUID, Primary Key)
- `scenario_id` (UUID, Foreign Key $\to$ `scenarios.id`)
- `asset_id` (UUID, Foreign Key $\to$ `assets.id`)
- `shock_percentage` (FLOAT) — e.g., $-0.30$ for $-30\%$

### 2.10 `alerts`
Control engine threshold breach events.
- `id` (UUID, Primary Key)
- `portfolio_id` (UUID, Foreign Key $\to$ `portfolios.id`)
- `risk_level` (VARCHAR 20)
- `metric` (VARCHAR 50)
- `threshold_value` (FLOAT)
- `actual_value` (FLOAT)
- `message` (TEXT)
- `created_at` (TIMESTAMP)

### 2.11 `rebalance_actions`
Compliance and governance log of recommendations and human decisions.
- `id` (UUID, Primary Key)
- `portfolio_id` (UUID, Foreign Key $\to$ `portfolios.id`)
- `optimization_id` (UUID, Foreign Key $\to$ `optimization_runs.id`)
- `action` (VARCHAR 50) — `HOLD`, `REBALANCE`, `CRISIS_PROTECTION`
- `approved` (BOOLEAN) — Human approval flag
- `transaction_cost` (NUMERIC 15,2)
- `risk_before` (FLOAT)
- `risk_after` (FLOAT)
- `reason` (TEXT) — Natural language explanation of decision
- `created_at` (TIMESTAMP)

---

## 3. Audit Integrity Principles

1. **Immutability:** `risk_snapshots`, `optimization_runs`, and `alerts` are append-only. They are never updated or deleted.
2. **State Traceability:** A rebalance approval updates `holdings`, but the prior state remains reconstructible via `optimization_allocations.old_weight` and `risk_snapshots`.
3. **Foreign Key Integrity:** Cascading deletes are prevented on audit tables to prevent accidental data loss.
