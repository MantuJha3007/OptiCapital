# AEGIS Database Architecture & Schema Specification

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Supported Database Engines:** PostgreSQL 16 (production/docker) & SQLite 3 (local zero-config default)  
**ORM:** SQLAlchemy 2.0  
**Migration & DDL:** Managed via SQLAlchemy metadata (`Base.metadata.create_all`)  
**Seeding Script:** [`backend/app/seed/seed_database.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/seed/seed_database.py)  

---

## 1. Dual-Database Engine Compatibility

AEGIS provides first-class dual compatibility for both **PostgreSQL** and **SQLite**:
- **SQLite 3 (Default Local):** If `DATABASE_URL` is omitted, the system defaults to `sqlite:///./opti_capital.db`. String-based UUIDs (UUID4 strings) and float/numeric abstractions are used to ensure zero-setup developer convenience.
- **PostgreSQL 16 (Production & Docker):** Set `DATABASE_URL=postgresql://user:pass@localhost:5432/opti_capital`. Provides multi-tenant concurrency, transactional isolation, and connection pooling.

---

## 2. Schema Overview

The database stores the full lifecycle of capital monitoring, risk assessment, optimizer runs, and human approval events across **11 normalized relational tables**:

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

## 3. Table Definitions

### 3.1 `assets`
Defines institutional investment instruments and their baseline risk parameters.
- `id` (String(36) UUID, Primary Key)
- `symbol` (VARCHAR 20, Unique, Indexed) — e.g., `EQUITY`, `GOV_BONDS`, `CORP_BONDS`, `GOLD`, `CASH`
- `name` (VARCHAR 100)
- `category` (VARCHAR 50) — `EQUITY`, `BONDS`, `COMMODITY`, `CASH`
- `expected_return` (FLOAT) — Annualized expected return
- `volatility` (FLOAT) — Annualized historical volatility
- `liquidity_score` (FLOAT) — Normalized liquidity index $[0.0, 1.0]$
- `min_weight` (FLOAT) — Mandate lower allocation bound
- `max_weight` (FLOAT) — Mandate upper allocation bound

### 3.2 `portfolios`
Represents managed institutional capital entities.
- `id` (String(36) UUID, Primary Key)
- `name` (VARCHAR 100)
- `total_capital` (NUMERIC 15,2) — Total fund valuation (default: ₹1,00,00,000 / ₹1 Crore)
- `risk_aversion` (FLOAT) — Risk aversion coefficient $\lambda$
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 3.3 `holdings`
Active portfolio composition and market valuations.
- `id` (String(36) UUID, Primary Key)
- `portfolio_id` (String(36) UUID, Foreign Key $\to$ `portfolios.id`)
- `asset_id` (String(36) UUID, Foreign Key $\to$ `assets.id`)
- `weight` (FLOAT) — Capital allocation weight $\in [0, 1]$
- `market_value` (NUMERIC 15,2) — Valuation in INR
- `updated_at` (TIMESTAMP)

### 3.4 `market_prices`
Daily OHLC market price history used to construct return series and covariance matrices.
- `id` (String(36) UUID, Primary Key)
- `asset_id` (String(36) UUID, Foreign Key $\to$ `assets.id`)
- `price_date` (DATE, Indexed)
- `open_price` (FLOAT)
- `high_price` (FLOAT)
- `low_price` (FLOAT)
- `close_price` (FLOAT)
- `volume` (BIGINT)

### 3.5 `risk_snapshots`
Immutable audit log of all computed risk evaluations.
- `id` (String(36) UUID, Primary Key)
- `portfolio_id` (String(36) UUID, Foreign Key $\to$ `portfolios.id`)
- `risk_score` (FLOAT) — Normalized composite score $0–100$
- `risk_level` (VARCHAR 20) — `SAFE`, `WARNING`, `STRESS`, `CRISIS`
- `expected_return` (FLOAT)
- `volatility` (FLOAT)
- `max_drawdown` (FLOAT)
- `liquidity_ratio` (FLOAT)
- `concentration` (FLOAT) — Herfindahl-Hirschman Index
- `market_stress` (FLOAT)
- `created_at` (TIMESTAMP)

### 3.6 `optimization_runs`
Audit records of CVXPY optimization invocations.
- `id` (String(36) UUID, Primary Key)
- `portfolio_id` (String(36) UUID, Foreign Key $\to$ `portfolios.id`)
- `risk_level` (VARCHAR 20)
- `risk_aversion` (FLOAT)
- `expected_return_before` (FLOAT)
- `volatility_before` (FLOAT)
- `expected_return_after` (FLOAT)
- `volatility_after` (FLOAT)
- `transaction_cost` (NUMERIC 15,2) — Total estimated trading friction
- `status` (VARCHAR 50) — `OPTIMAL`, `FEASIBLE_FALLBACK`, `FAILED`
- `created_at` (TIMESTAMP)

### 3.7 `optimization_allocations`
Per-asset weight transitions for each optimization run.
- `id` (String(36) UUID, Primary Key)
- `optimization_id` (String(36) UUID, Foreign Key $\to$ `optimization_runs.id`)
- `asset_id` (String(36) UUID, Foreign Key $\to$ `assets.id`)
- `old_weight` (FLOAT)
- `new_weight` (FLOAT)

### 3.8 `scenarios`
Predefined macroeconomic and financial stress scenario definitions.
- `id` (String(36) UUID, Primary Key)
- `name` (VARCHAR 100) — e.g., `Normal Market`, `Market Crash`, `High Inflation`, `Tech Shock`
- `description` (TEXT)
- `created_at` (TIMESTAMP)

### 3.9 `scenario_shocks`
Asset-specific shock magnitudes linked to scenarios.
- `id` (String(36) UUID, Primary Key)
- `scenario_id` (String(36) UUID, Foreign Key $\to$ `scenarios.id`)
- `asset_id` (String(36) UUID, Foreign Key $\to$ `assets.id`)
- `shock_percentage` (FLOAT) — e.g., $-0.30$ for $-30\%$

### 3.10 `alerts`
Control engine threshold breach events.
- `id` (String(36) UUID, Primary Key)
- `portfolio_id` (String(36) UUID, Foreign Key $\to$ `portfolios.id`)
- `risk_level` (VARCHAR 20)
- `metric` (VARCHAR 50)
- `threshold_value` (FLOAT)
- `actual_value` (FLOAT)
- `message` (TEXT)
- `created_at` (TIMESTAMP)

### 3.11 `rebalance_actions`
Compliance and governance log of recommendations and human decisions.
- `id` (String(36) UUID, Primary Key)
- `portfolio_id` (String(36) UUID, Foreign Key $\to$ `portfolios.id`)
- `optimization_id` (String(36) UUID, Foreign Key $\to$ `optimization_runs.id`)
- `action` (VARCHAR 50) — `HOLD`, `REBALANCE`, `CRISIS_PROTECTION`
- `approved` (BOOLEAN) — Human approval flag
- `transaction_cost` (NUMERIC 15,2)
- `risk_before` (FLOAT)
- `risk_after` (FLOAT)
- `reason` (TEXT) — Natural language explanation of decision
- `created_at` (TIMESTAMP)

---

## 4. Audit Integrity Principles

1. **Immutability:** `risk_snapshots`, `optimization_runs`, `optimization_allocations`, and `rebalance_actions` are append-only. They are never updated or deleted.
2. **State Traceability:** A rebalance approval updates `holdings`, but the prior state remains perfectly reconstructible via `optimization_allocations.old_weight` and `risk_snapshots`.
3. **Foreign Key Integrity:** Cascading deletes are prevented on audit tables to guarantee zero historical data loss.

---

## 5. Idempotent Seeding (`backend/app/seed/seed_database.py`)

Executing `python -m app.seed.seed_database` automatically:
1. Creates all tables if they do not already exist.
2. Seeds 5 foundational asset classes: `EQUITY` (38%), `GOV_BONDS` (25%), `CORP_BONDS` (15%), `GOLD` (16%), `CASH` (6%).
3. Seeds the default ₹1,00,00,000 (₹1 Crore) Institutional Balanced Fund.
4. Generates 250 daily historical OHLC price rows per asset.
5. Populates the 4 macro stress scenarios and per-asset shock vectors (`Normal Market`, `Market Crash`, `High Inflation`, `Tech Shock`).
