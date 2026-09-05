# OptiCapital (Smart Capital Guard) — Comprehensive System Architecture

> **Authoritative Technical Blueprint for Autonomous Coding Agents and Human Engineers**  
> **Repository:** `MantuJha3007/OptiCapital` | **Workspace Root:** `d:\Mantu Jha\Project\Finance`  
> **Status:** Production-Ready MVP (57 Unit Tests Passing, Backend & Frontend Running in Daemon Mode)

---

## Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [High-Level Architectural Overview](#2-high-level-architectural-overview)
3. [Full Project File & Directory Tree](#3-full-project-file--directory-tree)
4. [Database Architecture & Data Model (11 Tables)](#4-database-architecture--data-model-11-tables)
5. [Core Financial & Mathematical Engines](#5-core-financial--mathematical-engines)
6. [Dynamic Risk Control State Machine](#6-dynamic-risk-control-state-machine)
7. [CVXPY Convex Optimization Engine](#7-cvxpy-convex-optimization-engine)
8. [End-to-End Scenario & Rebalance Execution Pipelines](#8-end-to-end-scenario--rebalance-execution-pipelines)
9. [REST API Specification & Data Contracts](#9-rest-api-specification--data-contracts)
10. [Frontend Architecture & UI Design System](#10-frontend-architecture--ui-design-system)
11. [Environment Setup & Run Guide](#11-environment-setup--run-guide)
12. [Agent Extension Guide & Active Team Assignments](#12-agent-extension-guide--active-team-assignments)

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
Traditional portfolio management systems suffer from three critical structural flaws:
1. **Static Risk Management:** Risk controls are static constraints (e.g., fixed maximum equity of 50%) that fail to adapt when macroeconomic volatility spikes or liquidity evaporates.
2. **Disconnected Stress Testing:** Macro scenario analysis and portfolio rebalancing are isolated processes. Stress tests produce passive reports rather than automatically feeding into dynamic constraint-enforcing optimization engines.
3. **Opaque Trade Rationale & Friction:** Quantitative optimizers output allocation vectors without explainability, making compliance and human oversight slow and risky, while ignoring non-linear turnover costs.

### 1.2 The OptiCapital Solution
**OptiCapital (Smart Capital Guard)** is an autonomous capital management, risk-control, and dynamic rebalancing platform. It bridges real-time risk assessment, dynamic multi-regime boundary controls, convex quadratic optimization with transaction costs, macro scenario shock propagation, and an auditable rebalancing workflow.

```
       ┌──────────────────────┐
       │   Market Realities   │ (Historical Prices, Volatility, Correlations)
       └──────────┬───────────┘
                  ▼
       ┌──────────────────────┐
       │     Risk Engine      │ (6-Factor Composite Score: 0 to 100)
       └──────────┬───────────┘
                  ▼
       ┌──────────────────────┐
       │    Control Engine    │ (Regimes: SAFE, WARNING, STRESS, CRISIS)
       └──────────┬───────────┘
                  ▼
       ┌──────────────────────┐
       │   CVXPY Optimizer    │ (Convex QP: Return vs Volatility vs Turnover Penalty)
       └──────────┬───────────┘
                  ▼
       ┌──────────────────────┐
       │ Rebalance & Audit    │ (Human-in-the-loop Approval & Ledger Update)
       └──────────────────────┘
```

---

## 2. High-Level Architectural Overview

OptiCapital uses a decoupled layered architecture:
- **Client Tier (Frontend):** Single Page Application built with React 18, TypeScript, Vite, Recharts, and custom CSS design tokens. Proxies `/api` requests to port `8000`.
- **API & Application Tier (Backend):** FastAPI ASGI application running under Uvicorn on port `8000`. Clean separation of concerns between API endpoints (`app/api/`), business services (`app/services/`), financial mathematics (`app/core/`), and data schemas (`app/schemas/`).
- **Optimization & Quantitative Core:** NumPy, Pandas, and CVXPY solving convex quadratic programs using the `SCS` (Splitting Conic Solver) solver.
- **Persistence Tier (Database):** PostgreSQL 16 running inside a Docker container (`smart-capital-postgres`), accessed via SQLAlchemy 2.0 ORM and Psycopg 3 (`postgresql+psycopg://`). Schema versioning handled via Alembic.

### 2.1 Component Interaction Diagram

```mermaid
flowchart TD
    subgraph UI["Frontend (Vite + React + TypeScript : 5173)"]
        Dashboard["Dashboard Component"]
        Charts["Recharts (Donut, Radial, Comparison)"]
        ApiClient["api.ts Fetch Client"]
        Dashboard --> Charts
        Dashboard --> ApiClient
    end

    subgraph API["FastAPI Application Layer (: 8000)"]
        Router["APIRouter (/api)"]
        HealthRoute["health.py"]
        PortfolioRoute["portfolio.py"]
        RiskRoute["risk.py"]
        OptRoute["optimization.py"]
        ScenarioRoute["scenarios.py"]
        RebalanceRoute["rebalance.py"]

        Router --> HealthRoute
        Router --> PortfolioRoute
        Router --> RiskRoute
        Router --> OptRoute
        Router --> ScenarioRoute
        Router --> RebalanceRoute
    end

    subgraph Services["Domain Service Layer"]
        PortService["portfolio_service.py"]
        MarketService["market_data_service.py"]
        RiskEngine["risk_engine.py"]
        ControlEngine["control_engine.py"]
        OptimizerService["optimizer.py"]
        ScenarioService["scenario_engine.py"]
        RebalanceService["rebalancer.py"]
        ExplService["explanation_service.py"]
    end

    subgraph QuantCore["Financial Quantitative Core"]
        Formulas["formulas.py (NumPy)"]
        RiskLevels["risk_levels.py"]
        Constants["constants.py"]
        CvxpySolver["CVXPY Solver (SCS)"]
    end

    subgraph DB["PostgreSQL 16 (Docker Container : 5432)"]
        SQLA["SQLAlchemy 2.0 Models"]
        Tables[("11 Relational Tables")]
        SQLA --> Tables
    end

    ApiClient -->|HTTP REST JSON| Router
    PortfolioRoute --> PortService
    RiskRoute --> RiskEngine
    OptRoute --> OptimizerService
    ScenarioRoute --> ScenarioService
    RebalanceRoute --> RebalanceService

    ScenarioService --> PortService
    ScenarioService --> MarketService
    ScenarioService --> RiskEngine
    ScenarioService --> ControlEngine
    ScenarioService --> OptimizerService
    ScenarioService --> ExplService
    ScenarioService --> RebalanceService

    RiskEngine --> Formulas
    RiskEngine --> MarketService
    ControlEngine --> RiskLevels
    OptimizerService --> CvxpySolver
    OptimizerService --> Formulas

    PortService --> SQLA
    MarketService --> SQLA
    RiskEngine --> SQLA
    OptimizerService --> SQLA
    ScenarioService --> SQLA
    RebalanceService --> SQLA
```

---

## 3. Full Project File & Directory Tree

```
d:\Mantu Jha\Project\Finance\
├── .env                              # Active environment variables (Database URL, CORS, Risk params)
├── .env.example                      # Template for required environment variables
├── .gitignore                        # Git exclusion rules (node_modules, venv, pycache, dist)
├── docker-compose.yml                # Docker definition for PostgreSQL 16 container
├── README.md                         # Project documentation and quickstart instructions
├── architecture.md                   # Root copy: Master architectural blueprint
├── instruction.md                    # Original hackathon specifications
├── hemant.md                         # Detailed backend enhancement spec (Assigned to Hemant)
├── gaurav.md                         # Detailed frontend enhancement spec (Assigned to Gaurav)
├── docs/                             # Supporting documentation
│   ├── architecture.md               # THIS FILE: Master architectural blueprint
│   ├── database.md                   # Concise database table reference
│   ├── financial-model.md            # Formulas and risk score documentation
│   ├── api.md                        # Summary API route list
│   └── demo-script.md                # Step-by-step hackathon judging presentation script
├── backend/                          # Python 3.11+ Backend application
│   ├── requirements.txt              # Production Python dependencies
│   ├── Dockerfile                    # Containerization spec for FastAPI service
│   ├── alembic.ini                   # Alembic database migration config
│   ├── venv/                         # Local Python virtual environment
│   ├── migrations/                   # Alembic migration scripts
│   │   ├── env.py                    # Alembic runtime environment (imports Base.metadata)
│   │   ├── script.py.mako            # Migration template
│   │   └── versions/
│   │       └── 001_initial_schema.py # Initial DDL migration for all 11 tables
│   ├── tests/                    # Pytest test suite (57 tests passing)
│   │   ├── __init__.py
│   │   ├── conftest.py           # Fixtures: in-memory SQLite DB, sample portfolio & prices
│   │   ├── test_risk.py          # Unit tests for 6 risk metrics and composite score
│   │   ├── test_optimizer.py     # Unit tests for CVXPY optimization feasibility and bounds
│   │   ├── test_controls.py      # Unit tests for regime mapping and dynamic constraints
│   │   ├── test_scenarios.py     # Integration tests for end-to-end shock pipeline
│   │   └── test_rebalance.py     # Unit tests for rebalance approval and ledger updates
│   └── app/
│       ├── __init__.py               # Package marker
│       ├── main.py                   # FastAPI app instance, CORS middleware, lifespan setup
│       ├── config.py                 # Pydantic SettingsConfigDict parsing environment variables
│       ├── database.py               # SQLAlchemy engine, SessionLocal, Base declarative class
│       ├── api/                      # REST API routing endpoints
│       │   ├── __init__.py
│       │   ├── health.py             # GET /api/health (Database ping and liveness)
│       │   ├── portfolio.py          # GET /api/portfolio, GET /api/portfolio/{id}
│       │   ├── risk.py               # GET /api/risk, GET /api/risk/history
│       │   ├── optimization.py       # POST /api/optimize, GET /api/optimization/history
│       │   ├── scenarios.py          # GET /api/scenarios, POST /api/scenarios/run
│       │   └── rebalance.py          # POST /api/rebalance, POST /api/rebalance/{id}/approve
│       ├── core/                     # Foundational financial logic and constants
│       │   ├── __init__.py
│       │   ├── constants.py          # Risk level strings, default weights, trading days
│       │   ├── formulas.py           # NumPy financial math: returns, vol, MaxDD, HHI, VaR
│       │   └── risk_levels.py        # Constraint dictionaries per risk regime (SAFE..CRISIS)
│       ├── models/                   # SQLAlchemy ORM database models (11 tables)
│       │   ├── __init__.py           # Re-exports all models for easy metadata registration
│       │   ├── asset.py              # Asset entity (symbol, expected return, vol, liquidity)
│       │   ├── portfolio.py          # Portfolio entity (total_capital, risk_aversion)
│       │   ├── holding.py            # Holding entity (portfolio_id, asset_id, weight, value)
│       │   ├── market_data.py        # MarketPrice entity (OHLC daily prices)
│       │   ├── risk_snapshot.py      # RiskSnapshot entity (score, level, 5 metric values)
│       │   ├── optimization.py       # OptimizationRun & OptimizationAllocation entities
│       │   ├── scenario.py           # Scenario & ScenarioShock entities
│       │   ├── alert.py              # Alert entity (breach notifications, severity)
│       │   └── rebalance.py          # RebalanceAction entity (audit trail, approval state)
│       ├── schemas/                  # Pydantic V2 request & response validation schemas
│       │   ├── __init__.py
│       │   ├── asset.py              # AssetResponse schema
│       │   ├── portfolio.py          # PortfolioResponse, HoldingResponse
│       │   ├── risk.py               # RiskResponse, RiskMetricsResponse
│       │   ├── optimization.py       # OptimizeRequest, OptimizationResponse
│       │   ├── scenario.py           # ScenarioResponse, ScenarioRunRequest, ScenarioRunResponse
│       │   └── rebalance.py          # RebalanceRequest, RebalanceActionResponse
│       ├── services/                 # Core domain business logic
│       │   ├── __init__.py
│       │   ├── market_data_service.py# Loads prices, calculates returns & covariance matrix
│       │   ├── portfolio_service.py  # Portfolio valuation, asset extraction, holdings access
│       │   ├── risk_engine.py        # Calculates 6 metrics & composite 0-100 score
│       │   ├── control_engine.py     # Evaluates threshold breaches & generates dynamic bounds
│       │   ├── optimizer.py          # Formulates and solves CVXPY convex quadratic program
│       │   ├── scenario_engine.py    # Macro shock runner: Shock -> Risk -> Control -> Optimize
│       │   ├── rebalancer.py         # Evaluates HOLD/REBALANCE/CRISIS, updates holdings on approval
│       │   └── explanation_service.py# Human-readable rationale generation for changes
│       └── seed/
│           ├── __init__.py
│           └── seed_database.py      # Deterministic seeder: 5 assets, 1 portfolio, 1250 prices
└── frontend/                         # Vite + React 18 + TypeScript Web Application
    ├── index.html                    # Root HTML document
    ├── package.json                  # Frontend dependencies (@vitejs/plugin-react, recharts, lucide)
    ├── tsconfig.json                 # TypeScript compiler options
    ├── vite.config.ts                # Vite config with proxy: /api -> http://127.0.0.1:8000
    └── src/
        ├── main.tsx                  # React entry point
        ├── App.tsx                   # App wrapper rendering Dashboard
        ├── Dashboard.tsx             # Institutional dashboard with KPI cards, charts, tabs
        ├── index.css                 # Dark-mode styling, glassmorphism, glowing badges, tokens
        ├── api.ts                    # Strongly-typed fetch API client communicating with backend
        └── types.ts                  # TypeScript interfaces matching backend Pydantic schemas
```

---

## 4. Database Architecture & Data Model (11 Tables)

All primary keys use UUIDv4 (except `market_prices` which uses auto-incrementing 64-bit `BIGINT` for high-throughput time series efficiency). Financial values are persisted as `NUMERIC(18, 2)` to eliminate floating-point rounding errors.

### 4.1 Entity Relationship Diagram

```mermaid
erDiagram
    portfolios ||--o{ holdings : "has"
    portfolios ||--o{ risk_snapshots : "records"
    portfolios ||--o{ optimization_runs : "generates"
    portfolios ||--o{ alerts : "triggers"
    portfolios ||--o{ rebalance_actions : "logs"
    assets ||--o{ holdings : "allocated_in"
    assets ||--o{ market_prices : "has_history"
    assets ||--o{ scenario_shocks : "target_of"
    scenarios ||--o{ scenario_shocks : "contains"
    optimization_runs ||--o{ optimization_allocations : "specifies"
    optimization_runs ||--o| rebalance_actions : "triggers"

    portfolios {
        UUID id PK
        VARCHAR name
        NUMERIC total_capital
        FLOAT risk_aversion
        DATETIME created_at
        DATETIME updated_at
    }

    assets {
        UUID id PK
        VARCHAR symbol UK
        VARCHAR name
        VARCHAR category
        FLOAT expected_return
        FLOAT volatility
        FLOAT liquidity_score
        FLOAT min_weight
        FLOAT max_weight
        DATETIME created_at
    }

    holdings {
        UUID id PK
        UUID portfolio_id FK
        UUID asset_id FK
        FLOAT weight
        NUMERIC market_value
        DATETIME updated_at
    }

    market_prices {
        BIGINT id PK
        UUID asset_id FK
        DATE price_date
        FLOAT open_price
        FLOAT high_price
        FLOAT low_price
        FLOAT close_price
    }

    risk_snapshots {
        UUID id PK
        UUID portfolio_id FK
        FLOAT risk_score
        VARCHAR risk_level
        FLOAT expected_return
        FLOAT volatility
        FLOAT max_drawdown
        FLOAT liquidity_ratio
        FLOAT concentration
        FLOAT market_stress
        DATETIME created_at
    }

    optimization_runs {
        UUID id PK
        UUID portfolio_id FK
        VARCHAR risk_level
        FLOAT risk_aversion
        FLOAT expected_return_before
        FLOAT volatility_before
        FLOAT expected_return_after
        FLOAT volatility_after
        NUMERIC transaction_cost
        VARCHAR status
        DATETIME created_at
    }

    optimization_allocations {
        UUID id PK
        UUID optimization_id FK
        UUID asset_id FK
        FLOAT old_weight
        FLOAT new_weight
    }

    scenarios {
        UUID id PK
        VARCHAR name
        TEXT description
        DATETIME created_at
    }

    scenario_shocks {
        UUID id PK
        UUID scenario_id FK
        UUID asset_id FK
        FLOAT shock_percentage
    }

    alerts {
        UUID id PK
        UUID portfolio_id FK
        VARCHAR severity
        VARCHAR title
        TEXT message
        VARCHAR metric
        FLOAT metric_value
        FLOAT threshold_value
        BOOLEAN acknowledged
        DATETIME created_at
    }

    rebalance_actions {
        UUID id PK
        UUID portfolio_id FK
        UUID optimization_id FK
        VARCHAR action
        BOOLEAN approved
        NUMERIC transaction_cost
        FLOAT risk_before
        FLOAT risk_after
        TEXT reason
        DATETIME created_at
    }
```

### 4.2 Table Specifications

| # | Table Name | Key Columns | Indexes / Constraints | Purpose |
|---|------------|-------------|-----------------------|---------|
| 1 | `assets` | `id` (UUID PK), `symbol` (VARCHAR 20, UNIQUE), `name`, `category`, `expected_return`, `volatility`, `liquidity_score`, `min_weight`, `max_weight` | Unique on `symbol` | Master catalogue of investable assets |
| 2 | `portfolios` | `id` (UUID PK), `name` (VARCHAR 100), `total_capital` (NUMERIC 18,2), `risk_aversion` (FLOAT) | PK on `id` | Portfolio instance with total capital |
| 3 | `holdings` | `id` (UUID PK), `portfolio_id` (FK `portfolios.id` CASCADE), `asset_id` (FK `assets.id`), `weight` (FLOAT), `market_value` (NUMERIC 18,2) | Unique on `(portfolio_id, asset_id)` | Current capital allocation per asset |
| 4 | `market_prices` | `id` (BIGINT PK AUTO), `asset_id` (FK `assets.id`), `price_date` (DATE), `open_price`, `high_price`, `low_price`, `close_price` | Unique on `(asset_id, price_date)` | Daily historical OHLC price feed (250 days seeded) |
| 5 | `risk_snapshots` | `id` (UUID PK), `portfolio_id` (FK), `risk_score` (FLOAT), `risk_level` (VARCHAR 20), 5 metric floats, `created_at` | Index on `portfolio_id, created_at` | Historical log of calculated portfolio risk scores |
| 6 | `optimization_runs`| `id` (UUID PK), `portfolio_id` (FK), `risk_level`, `risk_aversion`, return/vol before/after, `transaction_cost`, `status` | FK to `portfolios.id` | Audit record of an optimizer execution |
| 7 | `optimization_allocations` | `id` (UUID PK), `optimization_id` (FK CASCADE), `asset_id` (FK), `old_weight`, `new_weight` | FK to `optimization_runs.id` | Target weights produced by optimizer per asset |
| 8 | `scenarios` | `id` (UUID PK), `name` (VARCHAR 100), `description` (TEXT) | PK on `id` | Stress test definitions (e.g., Market Crash) |
| 9 | `scenario_shocks` | `id` (UUID PK), `scenario_id` (FK CASCADE), `asset_id` (FK), `shock_percentage` (FLOAT) | FK to `scenarios.id` and `assets.id` | Asset-specific price shocks (e.g. Equity -30%) |
| 10| `alerts` | `id` (UUID PK), `portfolio_id` (FK), `severity`, `title`, `message`, `metric`, `metric_value`, `threshold_value`, `acknowledged` | Index on `portfolio_id, acknowledged` | Boundary breach events raised by Control Engine |
| 11| `rebalance_actions` | `id` (UUID PK), `portfolio_id` (FK), `optimization_id` (FK), `action`, `approved` (BOOL), `transaction_cost`, `risk_before`, `risk_after`, `reason` | FK to `portfolios.id` and `optimization_runs.id` | Audit log for trade actions (HOLD/REBALANCE/CRISIS) |

---

## 5. Core Financial & Mathematical Engines

All mathematical formulas reside in `backend/app/core/formulas.py` and are implemented with vectorized NumPy operations for sub-millisecond execution.

### 5.1 Portfolio Return & Volatility
- **Portfolio Expected Return ($R_p$):**
  $$R_p = w^T \mu = \sum_{i=1}^n w_i \mu_i$$
- **Portfolio Annualized Volatility ($\sigma_p$):**
  $$\sigma_p = \sqrt{w^T \Sigma w}$$
  Where:
  - $w \in \mathbb{R}^n$ is the allocation weight vector ($\sum w_i = 1$)
  - $\mu \in \mathbb{R}^n$ is the annualized expected return vector
  - $\Sigma \in \mathbb{R}^{n \times n}$ is the annualized asset covariance matrix ($\Sigma_{\text{annual}} = 252 \cdot \Sigma_{\text{daily}}$)

### 5.2 Maximum Drawdown ($MDD$)
Calculated from the cumulative portfolio equity curve:
$$MDD = \max_{t \in [0, T]} \left( \frac{\max_{s \in [0, t]} V_s - V_t}{\max_{s \in [0, t]} V_s} \right)$$
Implemented via `np.maximum.accumulate(cumulative_returns)`.

### 5.3 Concentration: Herfindahl-Hirschman Index ($HHI$)
Measures capital allocation concentration:
$$HHI = \sum_{i=1}^n w_i^2$$
- For an equal-weight 5-asset portfolio ($w_i = 0.20$): $HHI = 5 \times 0.20^2 = 0.20$ (minimum concentration / maximum diversification).
- For a 100% single asset concentration: $HHI = 1.00$.

### 5.4 Portfolio Liquidity Ratio ($L_p$)
Weighted sum of asset-level liquidity scores ($l_i \in [0, 1]$):
$$L_p = w^T l = \sum_{i=1}^n w_i l_i$$

### 5.5 Market Stress Indicator ($S_m$)
Measures current portfolio volatility against historical average asset volatility:
$$S_m = \text{clamp}\left( \frac{\sigma_p}{\bar{\sigma}_{\text{hist}}} - 1.0, 0.0, 1.0 \right)$$
- If current volatility equals historical: $S_m = 0.0$.
- If current volatility reaches $2\times$ historical: $S_m = 1.0$.

### 5.6 Composite Risk Score Calculation ($0 - 100$)
The platform normalizes the 5 raw metrics into component sub-scores from $0$ to $100$:

| Metric | Code Formula | Normalization Rule | Weight |
|--------|--------------|--------------------|--------|
| **Volatility** | `min(vol / 0.30, 1.0) * 100` | $0\% \to 0$, $30\%+ \to 100$ | **30%** (`RISK_WEIGHT_VOLATILITY = 0.30`) |
| **Max Drawdown** | `min(mdd / 0.20, 1.0) * 100` | $0\% \to 0$, $20\%+ \to 100$ | **25%** (`RISK_WEIGHT_DRAWDOWN = 0.25`) |
| **Concentration** | `max((hhi - 0.20) / 0.80, 0.0) * 100` | $0.20 \to 0$, $1.00 \to 100$ | **20%** (`RISK_WEIGHT_CONCENTRATION = 0.20`) |
| **Liquidity** | `(1.0 - liq) * 100` | $1.0 \to 0$, $0.0 \to 100$ (Inverse) | **15%** (`RISK_WEIGHT_LIQUIDITY = 0.15`) |
| **Market Stress**| `stress * 100` | $0.0 \to 0$, $1.0 \to 100$ | **10%** (`RISK_WEIGHT_MARKET_STRESS = 0.10`) |

$$\text{Composite Risk Score} = 0.30 S_{\text{vol}} + 0.25 S_{\text{dd}} + 0.20 S_{\text{conc}} + 0.15 S_{\text{liq}} + 0.10 S_{\text{stress}}$$

---

## 6. Dynamic Risk Control State Machine

The Control Engine (`backend/app/services/control_engine.py`) takes the composite risk score and maps it to one of four discrete risk regimes. Each regime applies strict dynamic inequality constraints to the optimizer:

```
 Composite Risk Score:
 0 ────────────── 30 ────────────── 60 ────────────── 80 ────────────── 100
 [     SAFE     ]  [   WARNING    ]  [    STRESS    ]  [    CRISIS    ]
```

### 6.1 Regime Constraints Matrix

| Parameter / Constraint | `SAFE` (0–29.9) | `WARNING` (30–59.9) | `STRESS` (60–79.9) | `CRISIS` (80–100) |
|------------------------|-----------------|---------------------|--------------------|-------------------|
| **Max Equity Allocation ($w_{\text{equity}}$)** | $\le 50\%$ | $\le 45\%$ | $\le 35\%$ | $\le 20\%$ |
| **Min Cash Allocation ($w_{\text{cash}}$)** | $\ge 10\%$ | $\ge 12\%$ | $\ge 15\%$ | $\ge 20\%$ |
| **Max Portfolio Volatility ($\sigma_p$)** | $\le 15.0\%$ | $\le 14.0\%$ | $\le 12.0\%$ | $\le 10.0\%$ |
| **Max Historical Drawdown ($MDD$)** | $\le 10.0\%$ | $\le 10.0\%$ | $\le 8.0\%$ | $\le 5.0\%$ |
| **Default Action Trigger** | `HOLD` | `HOLD` / `REBALANCE` | `REBALANCE` | `CRISIS_PROTECTION` |

### 6.2 Threshold Breach Detection
The Control Engine evaluates whether any portfolio metric breaches the `SAFE` baseline:
- `volatility > 15.0%` $\to$ Warning alert triggered
- `max_drawdown > 10.0%` $\to$ Capital protection breach alert
- `liquidity_ratio < 20.0%` $\to$ Illiquidity warning
- `concentration (HHI) > 0.30` $\to$ Concentration alarm
- `market_stress > 0.50` $\to$ Macro dislocation warning

---

## 7. CVXPY Convex Optimization Engine

The optimizer (`backend/app/services/optimizer.py`) implements a constrained mean-variance convex quadratic program penalized by turnover costs.

### 7.1 Mathematical Formulation

$$\max_{w} \left( w^T \mu - \lambda w^T \Sigma w - c \cdot V_{\text{port}} \|w - w_{\text{current}}\|_1 \right)$$

Subject to:
1. **Budget constraint (Full investment):**
   $$\sum_{i=1}^n w_i = 1$$
2. **Long-only constraint (No short sales):**
   $$w_i \ge 0, \quad \forall i$$
3. **Dynamic asset boundary constraints from Control Engine:**
   $$w_{\text{equity}} \le \text{max\_equity}(\text{regime})$$
   $$w_{\text{cash}} \ge \text{min\_cash}(\text{regime})$$
4. **Instrument-specific limits:**
   $$w_i \le \text{asset.max\_weight}, \quad w_i \ge \text{asset.min\_weight}$$
5. **Portfolio Volatility Cone constraint:**
   $$w^T \Sigma w \le \sigma_{\max}^2(\text{regime})$$

Where:
- $\lambda$ (`settings.risk_aversion`): Risk-aversion penalty parameter (default $= 1.0$).
- $c$ (`settings.transaction_cost_rate`): Proportional trading cost rate (default $= 0.001$, or 10 bps).
- $V_{\text{port}}$: Total monetary value of portfolio at rebalance time (e.g. ₹1,00,00,000).
- $\|w - w_{\text{current}}\|_1 = \sum_{i=1}^n |w_i - w_{\text{current}, i}|$: Portfolio turnover (L1 norm).

### 7.2 Solver Implementation
The optimization problem is expressed in CVXPY:
```python
w = cp.Variable(n)
ret = mean_returns @ w
risk = cp.quad_form(w, cov_matrix)
turnover = cp.norm1(w - current_weights)
txn = turnover * portfolio_value * cost_rate

objective = cp.Maximize(ret - risk_aversion * risk - txn)
problem = cp.Problem(objective, constraints)
problem.solve(solver=cp.SCS, verbose=False)
```
Numerical precision protection: Post-solve weights are clipped at $0.0$ and renormalized to ensure exact $\sum w_i = 1.0$.

---

## 8. End-to-End Scenario & Rebalance Execution Pipelines

### 8.1 Macro Scenario Shock Pipeline (`POST /api/scenarios/run`)

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Coding Agent
    participant Route as scenarios.py API
    participant Engine as scenario_engine.py
    participant DB as PostgreSQL DB
    participant Risk as risk_engine.py
    participant Control as control_engine.py
    participant Opt as optimizer.py
    participant Expl as explanation_service.py
    participant Reb as rebalancer.py

    User->>Route: POST /api/scenarios/run {"scenario_id": "..."}
    Route->>Engine: run_scenario(db, portfolio, scenario)
    Engine->>DB: Fetch portfolio, holdings, assets, market prices
    Engine->>Risk: calculate_risk(db, portfolio) [Pre-Shock]
    Risk->>DB: save_risk_snapshot(pre_shock_risk)
    
    rect rgb(240, 248, 255)
        note over Engine: Step 3: Apply Scenario Shocks
        Engine->>Engine: asset_val_after = asset_val * (1 + shock_pct)
        Engine->>Engine: shocked_weights = asset_val_after / total_val_after
    end

    Engine->>Risk: calculate_risk(weights_override=shocked_weights) [Post-Shock]
    Risk->>DB: save_risk_snapshot(post_shock_risk)
    
    Engine->>Control: evaluate_controls(post_shock_risk)
    Control-->>Engine: Return regime (e.g. CRISIS), dynamic constraints, breaches

    Engine->>Opt: optimize_portfolio(shocked_weights, constraints)
    Opt-->>Engine: Optimal weights, new vol, expected return, txn cost
    Opt->>DB: save_optimization_run(...)

    Engine->>Reb: determine_action(post_shock_risk, control_result)
    Engine->>Expl: generate_explanation(...)
    Engine->>Reb: save_rebalance_action(audit_record)
    Reb->>DB: Persist RebalanceAction entity

    Engine-->>Route: Return structured Before/After/Control/Recommendation JSON
    Route-->>User: 200 OK Response
```

### 8.2 Rebalance Approval & Execution Pipeline (`POST /api/rebalance`)

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin
    participant Route as rebalance.py API
    participant Reb as rebalancer.py
    participant DB as PostgreSQL DB

    User->>Route: POST /api/rebalance {"optimization_id": "...", "approved": true}
    Route->>Reb: approve_rebalance(db, optimization_id)
    Reb->>DB: Query OptimizationRun & OptimizationAllocations
    Reb->>DB: For each asset: Update holdings.weight = new_weight
    Reb->>DB: Update holdings.market_value = new_weight * total_capital
    Reb->>DB: Update rebalance_actions.approved = True
    Reb->>DB: Commit transaction
    Reb-->>Route: Success confirmation
    Route-->>User: 200 OK {"status": "approved", "message": "Holdings updated successfully."}
```

---

## 9. REST API Specification & Data Contracts

Base URL: `http://localhost:8000/api`

### 9.1 Health Check
- **Endpoint:** `GET /api/health`
- **Description:** Verifies service liveness and database connectivity.
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 9.2 Portfolio Details
- **Endpoint:** `GET /api/portfolio`
- **Description:** Returns the active portfolio with its complete holdings breakdown.
- **Response (200 OK):**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "name": "Smart Capital Demo Portfolio",
  "total_capital": 10000000.0,
  "risk_aversion": 1.0,
  "holdings": [
    {
      "id": "a1b2c3d4-...",
      "asset_id": "b2c3d4e5-...",
      "weight": 0.45,
      "market_value": 4500000.0,
      "asset": {
        "id": "b2c3d4e5-...",
        "symbol": "EQUITY",
        "name": "Equity",
        "category": "EQUITY",
        "expected_return": 0.12,
        "volatility": 0.22,
        "liquidity_score": 0.90,
        "min_weight": 0.0,
        "max_weight": 0.50
      }
    }
  ]
}
```

### 9.3 Real-Time Risk Snapshot
- **Endpoint:** `GET /api/risk`
- **Description:** Runs the risk engine on the current live portfolio, persists a new `risk_snapshots` record, and returns the score and metrics.
- **Response (200 OK):**
```json
{
  "risk_score": 24.3,
  "risk_level": "SAFE",
  "metrics": {
    "expected_return": 0.092,
    "volatility": 0.114,
    "max_drawdown": 0.071,
    "liquidity_ratio": 0.885,
    "concentration": 0.295,
    "market_stress": 0.0
  }
}
```

### 9.4 List Stress Scenarios
- **Endpoint:** `GET /api/scenarios`
- **Description:** Retrieves all predefined stress test scenarios with per-asset shock values.
- **Response (200 OK):**
```json
[
  {
    "id": "e3b0c442-...",
    "name": "Market Crash",
    "description": "Severe equity decline with flight to safety.",
    "shocks": [
      { "symbol": "EQUITY", "shock_percentage": -0.30 },
      { "symbol": "GOV_BONDS", "shock_percentage": -0.05 },
      { "symbol": "CORP_BONDS", "shock_percentage": -0.10 },
      { "symbol": "GOLD", "shock_percentage": 0.12 },
      { "symbol": "CASH", "shock_percentage": 0.0 }
    ]
  }
]
```

### 9.5 Run Stress Simulation (Core Endpoint)
- **Endpoint:** `POST /api/scenarios/run`
- **Request Body:**
```json
{
  "scenario_id": "e3b0c442-..."
}
```
- **Response (200 OK):**
```json
{
  "scenario": {
    "id": "e3b0c442-...",
    "name": "Market Crash",
    "description": "Severe equity decline with flight to safety."
  },
  "before": {
    "portfolio_value": 10000000.0,
    "risk_score": 24.3,
    "risk_level": "SAFE",
    "volatility": 0.114,
    "drawdown": 0.071,
    "liquidity": 0.885
  },
  "shock": {
    "details": {
      "equity": -0.30,
      "gov_bonds": -0.05,
      "corp_bonds": -0.10,
      "gold": 0.12,
      "cash": 0.0
    },
    "portfolio_loss": -0.1505,
    "portfolio_value_after": 8495000.0
  },
  "after_shock": {
    "risk_score": 68.4,
    "risk_level": "STRESS",
    "volatility": 0.162,
    "drawdown": 0.158,
    "liquidity": 0.871
  },
  "control": {
    "mode": "STRESS",
    "breaches": [
      "Portfolio volatility (16.2%) exceeded configured limit (15%).",
      "Maximum drawdown (15.8%) exceeded configured limit (10%)."
    ],
    "constraints": {
      "max_equity": 0.35,
      "min_cash": 0.15,
      "max_volatility": 0.12,
      "max_drawdown": 0.08
    }
  },
  "recommendation": {
    "action": "REBALANCE",
    "optimization_id": "f47ac10b-...",
    "allocation": {
      "equity": 0.35,
      "gov_bonds": 0.30,
      "corp_bonds": 0.10,
      "gold": 0.10,
      "cash": 0.15
    },
    "transaction_cost": 4247.50,
    "turnover": 0.145,
    "risk_before": 68.4,
    "risk_after": 28.1,
    "explanation": "Portfolio risk level: STRESS (score: 68.4/100).\nThreshold breaches detected:\n  • Portfolio volatility (16.2%) exceeded configured limit (15%).\n  • Maximum drawdown (15.8%) exceeded configured limit (10%).\n..."
  }
}
```

### 9.6 Approve / Reject Rebalance
- **Endpoint:** `POST /api/rebalance`
- **Request Body:**
```json
{
  "optimization_id": "f47ac10b-...",
  "approved": true
}
```
- **Response (200 OK):**
```json
{
  "status": "approved",
  "portfolio_id": "7c9e6679-...",
  "optimization_id": "f47ac10b-...",
  "message": "Holdings updated successfully. Rebalance approved."
}
```

---

## 10. Frontend Architecture & UI Design System

### 10.1 UI Component Tree
```
main.tsx
└── App.tsx
    └── Dashboard.tsx
        ├── Header (Shield branding, title, live health status pill, reload button)
        ├── Metric KPI Cards (Portfolio Value, Expected Return, Volatility, Liquidity)
        ├── Main Grid Layout
        │   ├── Risk Gauge Card
        │   │   ├── SVG Radial Gauge (Animated stroke-dashoffset transition)
        │   │   ├── Risk Level Badge (.safe, .warning, .stress, .crisis)
        │   │   └── Breakdown Progress Bars (5 Risk Factor Bars)
        │   └── Asset Allocation Card
        │       ├── Recharts Donut Pie Chart (Curated HSL hex colors)
        │       └── Holdings Weight List (Symbol, Name, Percentage, Value)
        ├── Stress Testing & Rebalance Studio
        │   ├── Scenario Selector Buttons (Normal Market, Market Crash, Inflation Shock)
        │   ├── "Simulate Scenario" Primary Action Button (with loading spinner)
        │   └── Simulation Results Presentation
        │       ├── Comparative Table (Before Shock vs After Shock with Delta Arrows)
        │       ├── Boundary Breach Alerts Box
        │       └── Optimization Recommendation Card
        │           ├── Target Allocation Donut / Percentages
        │           ├── Turnover & Estimated Transaction Cost in ₹
        │           ├── Natural Language Explanation Text
        │           └── Action Button Pair: "Approve & Execute" vs "Reject"
        └── Audit Trail / Holdings Table
```

### 10.2 CSS Design Tokens (`frontend/src/index.css`)
- **Backgrounds:** Deep slate palette (`--bg-primary: #0a0e1a`, `--bg-card: #121829`, `--bg-card-hover: #182035`)
- **Typography:** Inter font family with high legibility monospace numbers for currency and ratios.
- **Accents:**
  - Indigo / Primary: `#6366f1`
  - Emerald / Safe: `#10b981`
  - Amber / Warning: `#f59e0b`
  - Orange / Stress: `#f97316`
  - Rose / Crisis: `#ef4444`
  - Cyan / Gov Bonds: `#06b6d4`
  - Purple / Corp Bonds: `#8b5cf6`

---

## 11. Environment Setup & Run Guide

### 11.1 Prerequisites
- **Docker Desktop** installed and running (for PostgreSQL 16 container).
- **Python 3.11+** installed with virtual environment capabilities.
- **Node.js 18+** and npm installed.

### 11.2 Environment Variables (`.env`)
```ini
DATABASE_URL=postgresql+psycopg://capital_user:capital_password@localhost:5432/smart_capital
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
RISK_AVERSION=1.0
TRANSACTION_COST_RATE=0.001
```

### 11.3 Step-by-Step Launch Sequence

#### Step 1: Start PostgreSQL Container
```powershell
docker-compose up -d
# Verify container is healthy:
docker ps
```

#### Step 2: Initialize Backend Virtual Environment & Dependencies
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### Step 3: Run Database Migrations & Seed Data
```powershell
# Run Alembic migrations
alembic upgrade head

# Seed initial 5 assets, 1 portfolio, 1250 price records, 3 scenarios
python -m app.seed.seed_database
```

#### Step 4: Start Backend Server
```powershell
# From backend directory with venv active:
python -m uvicorn app.main:app --reload --port 8000
```
Backend is live at `http://127.0.0.1:8000`. Swagger API docs at `http://127.0.0.1:8000/docs`.

#### Step 5: Start Frontend Server
```powershell
cd ..\frontend
npm install
npm run dev
```
Frontend is live at `http://localhost:5173`.

#### Step 6: Execute Test Suite
```powershell
cd ..\backend
.\venv\Scripts\python.exe -m pytest tests/ -v
# Expected: 57 passed
```

---

## 12. Agent Extension Guide & Active Team Assignments

This section specifies active work streams so coding agents can implement enhancements without merge conflicts or architectural drift.

### 12.1 Team Responsibilities Matrix

```
┌───────────────────────────┬─────────────────────────────────────────────────────────┐
│ Team Member               │ Primary Responsibility                                  │
├───────────────────────────┼─────────────────────────────────────────────────────────┤
│ Mantu (Team Leader)       │ Architecture, Integration, Demo Script, Pitch & Q&A     │
│ Hemant (Backend Lead)     │ Backend Risk Engines & Advanced Analytics (`hemant.md`) │
│ Gaurav (Frontend Lead)    │ UI/UX Dashboard, D3 Charts & Visualizations (`gaurav.md`)│
│ Member 4 (QA & Devops)    │ Test Coverage, CI/CD, Documentation & Demo Rehearsal   │
└───────────────────────────┴─────────────────────────────────────────────────────────┘
```

### 12.2 Hemant's Backend Extension Specifications (See `hemant.md`)
When working on backend analytics, implement the following modules inside `backend/app/services/`:

1. **Marginal Risk Attribution (`backend/app/services/risk_attribution.py`):**
   - Calculate each asset's percentage contribution to total portfolio variance:
     $$RC_i = \frac{w_i (\Sigma w)_i}{\sigma_p^2}, \quad \sum_{i=1}^n RC_i = 1.0$$
   - Add endpoint `GET /api/risk/attribution`.
2. **Reverse Stress Testing (`backend/app/services/reverse_stress.py`):**
   - Determine the minimal macroeconomic shock vector $\Delta s$ required to breach a target drawdown threshold (e.g. $MDD \ge 25\%$).
   - Add endpoint `POST /api/scenarios/reverse-stress`.
3. **Sortino Ratio & Downside Deviation (`backend/app/core/formulas.py`):**
   - Implement downside semi-variance with a minimum acceptable return ($MAR = 4\%$):
     $$\text{Downside Dev} = \sqrt{\frac{1}{T}\sum_{t=1}^T \min(0, r_t - MAR)^2}, \quad \text{Sortino} = \frac{R_p - MAR}{\text{Downside Dev}}$$
4. **Hierarchical Risk Parity (HRP) Benchmark (`backend/app/services/hrp_optimizer.py`):**
   - Implement Lopez de Prado's HRP via hierarchical clustering (single linkage) and quasi-diagonalization to provide side-by-side comparison against CVXPY Markowitz.

### 12.3 Gaurav's Frontend Extension Specifications (See `gaurav.md`)
When working on frontend components, implement the following modules inside `frontend/src/`:

1. **5-Tab Navigation Layout (`frontend/src/Dashboard.tsx`):**
   - Tab 1: **Executive Overview** (KPI cards, allocation donut, live health).
   - Tab 2: **Risk Matrix & Attribution** (Risk breakdown, Sortino ratio, asset risk contributions).
   - Tab 3: **Correlation & Contagion Network** (Interactive D3.js force-directed graph showing cross-asset correlation contagion).
   - Tab 4: **Scenario Stress Studio** (Interactive slider shocks, reverse stress test runner).
   - Tab 5: **Autonomous Execution Ledger** (Audit log of rebalance decisions, trade timeline).
2. **Interactive Contagion Graph (`frontend/src/components/CorrelationNetwork.tsx`):**
   - Render assets as nodes connected by correlation edges ($|\rho_{ij}| \ge 0.3$).
   - Edge thickness proportional to $|\rho_{ij}|$; color red for positive correlation, blue for negative.
   - Click node to simulate asset default.
3. **Animated Circular Gauge Enhancement:**
   - Add smooth CSS radial gradient sweep and pulse animation when entering `STRESS` or `CRISIS` mode.

### 12.4 Coding Agent Guardrails
When an autonomous coding agent performs changes to this codebase:
1. **Never alter existing endpoint JSON contracts** without backwards compatibility (`/api/scenarios/run` must always return `before`, `shock`, `after_shock`, `control`, `recommendation`).
2. **Never break database foreign keys** — always use UUIDs and maintain the `portfolio_id` relationship chain.
3. **Always preserve the 57 passing tests** — run `pytest` after any backend modification.
4. **Always use parameterized SQL / SQLAlchemy ORM queries** to prevent SQL injection.
5. **Always maintain financial numeric precision** — use `Decimal` or rounded floats matching database definitions.
