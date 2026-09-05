# AEGIS: Technical Architecture & System Design

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Document Status:** Canonical Technical Architecture  
**Target Environment:** Dockerized Multi-Container System (FastAPI, React, PostgreSQL)  

---

## 1. System Overview & Architectural Topology

AEGIS is designed as a three-tier, service-oriented architecture with decoupled compute, state, and presentation layers.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: PRESENTATION                            │
│  React 18 + Vite SPA (TypeScript, Tailwind CSS v4, Recharts, Lucide)   │
│  Port: 5173 (Development) / 80 (Production Nginx)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                        TIER 2: APPLICATION & COMPUTE                   │
│  FastAPI (Python 3.11+) + Uvicorn ASGI Server                          │
│  - Financial Math Engine (NumPy, SciPy, Pandas)                        │
│  - Convex Optimizer Engine (CVXPY with CLARABEL/OSQP/SCS)              │
│  - Layered Service Domain Logic & Independent Validator                │
│  Port: 8000                                                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 (psycopg2 / asyncpg)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        TIER 3: PERSISTENCE & AUDIT                     │
│  PostgreSQL 16 Relational Database Engine                              │
│  - 11 Core Normalized Tables                                           │
│  - Immutable Audit Trails (Risk Snapshots, Runs, Rebalance Actions)    │
│  Port: 5432                                                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture (React + TypeScript)

### 2.1 Technology Stack
- **Build Engine & Dev Server:** Vite 8.x
- **Core Library:** React 18 / TypeScript (~6.0)
- **Styling Architecture:** Tailwind CSS v4 + Vanilla CSS custom properties (`index.css` design system)
- **Visualization:** Recharts 3.x (RadialBar, Pie, Bar, Cell)
- **Iconography:** Lucide-React

### 2.2 Component Hierarchy & Layout
```text
App.tsx
  └── Dashboard.tsx (Root Controller)
        ├── Top Header Bar (Brand Identity, Capital Summary, Liveness Indicator)
        ├── System Status Ribbon (SOE Zone Badge: GREEN/YELLOW/ORANGE/RED, Hysteresis Indicator)
        ├── Primary Metrics Grid
        │     ├── RiskGauge (RadialBar SVG Gauge, Score / 100, Operating Mode)
        │     ├── PortfolioSummaryCard (Valuation, Return, Drawdown, Liquidity)
        │     └── AllocationDonutChart (Recharts Pie Chart with Asset-Class Palette)
        ├── Stress Lab Module
        │     ├── ScenarioSelector (Normal Market, Market Crash, High Inflation)
        │     ├── ShockPreviewMatrix (Per-asset shock table)
        │     └── RunSimulationButton (Triggers POST /api/scenarios/run)
        ├── Intervention & Recommendation Panel (Appears on breach/stress)
        │     ├── ThresholdBreachBanner (List of violated boundary limits)
        │     ├── BeforeAfterComparison (Side-by-side metric delta)
        │     ├── AllocationDiffTable (Current vs Candidate weights, Delta %)
        │     ├── FinancialFrictionSummary (Turnover %, Estimated Transaction Cost ₹)
        │     ├── ValidationBadge (Independent Validator PASS/FAIL certification)
        │     ├── NaturalLanguageExplanation (Synthesized explanation text)
        │     └── ActionButtonGroup ([APPROVE REBALANCE], [REJECT RECOMMENDATION])
        └── Audit Trail View
              └── DecisionHistoryTable (Chronological list of optimizations & approvals)
```

### 2.3 State Management & API Integration
- State is managed via React hooks (`useState`, `useEffect`, `useCallback`) with declarative fetch lifecycles.
- All API interactions are encapsulated within `frontend/src/api.ts` exposing typed asynchronous promises.
- Custom response types are defined in `frontend/src/types.ts` mirroring backend Pydantic schemas.

---

## 3. Backend Architecture (FastAPI + Python)

### 3.1 Design Pattern: Layered Domain Services
The backend is structured to isolate HTTP concerns from financial mathematics and database transactions:

```text
[HTTP Request]
     │
     ▼
[API Router Layer] (app/api/*.py)
  - Deserializes & validates payloads via Pydantic schemas (app/schemas/*.py)
  - Injects database session via FastAPI Depends(get_db)
  - Catches domain exceptions and maps them to HTTP status codes
     │
     ▼
[Domain Service Layer] (app/services/*.py)
  - Coordinates financial workflows across specialized engines
  - Stateless execution: pure input/output mathematical pipelines
     │
     ▼
[Financial Math & Formulation Layer] (app/core/*.py & CVXPY)
  - Pure NumPy/SciPy linear algebra calculations
  - Convex objective & constraint construction
     │
     ▼
[Persistence Layer] (app/models/*.py & SQLAlchemy)
  - Session lifecycle management (commit, rollback, refresh)
  - Persists snapshots, optimization records, allocations, and audit logs
     │
     ▼
[HTTP Response]
```

### 3.2 FastAPI Lifespan & Startup Sequence
In `backend/app/main.py`:
1. `lifespan` context manager initializes database tables on boot via `Base.metadata.create_all(bind=engine)`.
2. Cross-Origin Resource Sharing (CORS) middleware is attached to permit requests from the Vite frontend.
3. Routers are registered under `/api`:
   - `health.router` $\to$ `/api/health`
   - `portfolio.router` $\to$ `/api/portfolio`
   - `risk.router` $\to$ `/api/risk`
   - `opt_api.router` $\to$ `/api/optimize`, `/api/optimization`
   - `scenarios.router` $\to$ `/api/scenarios`, `/api/scenarios/run`
   - `rebalance_api.router` $\to$ `/api/rebalance`, `/api/rebalance/history`

---

## 4. Optimization Engine (CVXPY Mathematical Formulation)

### 4.1 Problem Definition
The optimization problem is formulated as a Quadratic Program (QP) executed by CVXPY:

$$\min_{w \in \mathbb{R}^N} \quad f(w) = \frac{1}{2} \|w - w_0\|_2^2 + \gamma \sum_{i=1}^N |w_i - w_{0,i}| + \lambda w^T \Sigma w - \kappa w^T \mu$$

Where:
- $w$: Candidate weight vector (decision variable).
- $w_0$: Current / post-shock weight vector.
- $\frac{1}{2} \|w - w_0\|_2^2$: Minimum-intervention penalty (penalizes Euclidean divergence).
- $\gamma \sum |w_i - w_{0,i}|$: $L_1$ turnover norm scaled by transaction cost coefficient.
- $\lambda w^T \Sigma w$: Risk penalty on portfolio variance.
- $\kappa w^T \mu$: Return maximization incentive (secondary objective).

### 4.2 Convex Constraint Set
$$\begin{aligned}
\sum_{i=1}^N w_i &= 1.0 && \text{(Full investment)} \\
w_i &\ge 0 \quad \forall i && \text{(Long-only; no short selling)} \\
w_{\text{equity}} &\le \text{MaxEquity}_{\text{mode}} && \text{(Dynamic equity cap)} \\
w_{\text{cash}} &\ge \text{MinCash}_{\text{mode}} && \text{(Dynamic cash liquidity floor)} \\
w_i &\le w_i^{\max} \quad \forall i && \text{(Instrument upper bounds)} \\
w_i &\ge w_i^{\min} \quad \forall i && \text{(Instrument lower bounds)} \\
w^T \Sigma w &\le \sigma_{\max,\text{mode}}^2 && \text{(Dynamic volatility ceiling)}
\end{aligned}$$

### 4.3 Solver Infeasibility & Numerical Safeguards
- **Primary Solver:** `cp.CLARABEL` / `cp.OSQP` with fallback to `cp.SCS`.
- **Numerical Regularization:** Small numerical artifacts (e.g., $-10^{-16}$) are clipped to $0.0$, and the resulting vector is re-normalized:
  $$w^* = \frac{\max(w^*, 0)}{\sum \max(w^*, 0)}$$
- **Infeasibility Fallback:** If boundary conditions conflict under extreme stress, the system executes the **Deterministic Cash Sweep Fallback**:
  1. Trim Equity to Mode Limit: $w_{\text{equity}} \leftarrow \text{MaxEquity}_{\text{mode}}$.
  2. Shift excess weight into Cash: $w_{\text{cash}} \leftarrow w_{\text{cash}} + (w_{\text{equity}}^0 - \text{MaxEquity}_{\text{mode}})$.
  3. Flag run status as `FEASIBLE_FALLBACK`.

---

## 5. Independent Validator Architecture

To maintain regulatory rigor, validation is strictly decoupled from the solver:

```text
       ┌────────────────────────┐
       │   CVXPY Optimizer      │
       └───────────┬────────────┘
                   │ Candidate Allocation (w*)
                   ▼
       ┌────────────────────────┐
       │ Independent Validator  │
       └───────────┬────────────┘
                   │
  ┌────────────────┴────────────────┐
  │ Verification Checklist:         │
  │ 1. abs(sum(w*) - 1.0) <= 1e-4   │
  │ 2. all(w* >= -1e-5)             │
  │ 3. w*[EQUITY] <= MaxEquity      │
  │ 4. w*[CASH] >= MinCash          │
  │ 5. sqrt(w*^T Σ w*) <= MaxVol    │
  │ 6. max(w*) <= SingleAssetMax    │
  └────────────────┬────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼ (PASS)            ▼ (FAIL)
    Status: "PASS"     Status: "BLOCKED"
    Proceed to User    Trigger Fallback Rule
```

---

## 6. Database Architecture (PostgreSQL 16)

### 6.1 Relational Schema & Table Definitions

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

### 6.2 Table Specifications

1. **`assets`**: Financial instrument registry.
   - `id` (UUID, PK), `symbol` (VARCHAR 20, Unique), `name` (VARCHAR 100), `category` (VARCHAR 50), `expected_return` (FLOAT), `volatility` (FLOAT), `liquidity_score` (FLOAT), `min_weight` (FLOAT), `max_weight` (FLOAT).
2. **`portfolios`**: Portfolio entity.
   - `id` (UUID, PK), `name` (VARCHAR 100), `total_capital` (NUMERIC 15,2), `risk_aversion` (FLOAT), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).
3. **`holdings`**: Current portfolio composition.
   - `id` (UUID, PK), `portfolio_id` (FK $\to$ portfolios), `asset_id` (FK $\to$ assets), `weight` (FLOAT), `market_value` (NUMERIC 15,2), `updated_at` (TIMESTAMP).
4. **`market_prices`**: Historical daily price series.
   - `id` (UUID, PK), `asset_id` (FK $\to$ assets), `price_date` (DATE), `open_price`, `high_price`, `low_price`, `close_price` (FLOAT), `volume` (BIGINT).
5. **`risk_snapshots`**: Immutable record of calculated risk assessments.
   - `id` (UUID, PK), `portfolio_id` (FK $\to$ portfolios), `risk_score` (FLOAT), `risk_level` (VARCHAR 20), `expected_return` (FLOAT), `volatility` (FLOAT), `max_drawdown` (FLOAT), `liquidity_ratio` (FLOAT), `concentration` (FLOAT), `market_stress` (FLOAT), `created_at` (TIMESTAMP).
6. **`optimization_runs`**: Record of CVXPY optimization invocations.
   - `id` (UUID, PK), `portfolio_id` (FK $\to$ portfolios), `risk_level` (VARCHAR 20), `risk_aversion` (FLOAT), `expected_return_before` (FLOAT), `volatility_before` (FLOAT), `expected_return_after` (FLOAT), `volatility_after` (FLOAT), `transaction_cost` (NUMERIC 15,2), `status` (VARCHAR 50), `created_at` (TIMESTAMP).
7. **`optimization_allocations`**: Per-asset old vs new weight deltas for an optimization run.
   - `id` (UUID, PK), `optimization_id` (FK $\to$ optimization_runs), `asset_id` (FK $\to$ assets), `old_weight` (FLOAT), `new_weight` (FLOAT).
8. **`scenarios`**: Predefined macroeconomic scenarios.
   - `id` (UUID, PK), `name` (VARCHAR 100), `description` (TEXT), `created_at` (TIMESTAMP).
9. **`scenario_shocks`**: Asset-specific shock magnitudes per scenario.
   - `id` (UUID, PK), `scenario_id` (FK $\to$ scenarios), `asset_id` (FK $\to$ assets), `shock_percentage` (FLOAT).
10. **`alerts`**: Control engine threshold breach events.
    - `id` (UUID, PK), `portfolio_id` (FK $\to$ portfolios), `risk_level` (VARCHAR 20), `metric` (VARCHAR 50), `threshold_value` (FLOAT), `actual_value` (FLOAT), `message` (TEXT), `created_at` (TIMESTAMP).
11. **`rebalance_actions`**: Auditable record of recommendations and approvals.
    - `id` (UUID, PK), `portfolio_id` (FK $\to$ portfolios), `optimization_id` (FK $\to$ optimization_runs), `action` (VARCHAR 50), `approved` (BOOLEAN), `transaction_cost` (NUMERIC 15,2), `risk_before` (FLOAT), `risk_after` (FLOAT), `reason` (TEXT), `created_at` (TIMESTAMP).

---

## 7. Infrastructure & Deployment (Docker Compose)

The multi-container stack is declared in `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: aegis_postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-opti_capital}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: aegis_backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/opti_capital
      CORS_ORIGINS: http://localhost:5173,http://localhost:3000
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: aegis_frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 8. Communication Protocols & Request Lifecycles

### 8.1 Scenario Simulation & Control Sequence Diagram

```text
User          Frontend (React)         API (FastAPI)       Scenario/Risk Engine     Optimizer (CVXPY)    Validator      PostgreSQL
 │                   │                       │                      │                       │                │              │
 │── Click "RUN" ───►│                       │                      │                       │                │              │
 │                   │── POST /scenarios/run►│                      │                       │                │              │
 │                   │   {scenario_id}       │── Load Portfolio ───►│                       │                │              │
 │                   │                       │                      │── Fetch State/Prices─────────────────────────────────►│
 │                   │                       │                      │◄── Return Holdings/Prices─────────────────────────────│
 │                   │                       │                      │── Apply Shocks        │                │              │
 │                   │                       │                      │── Compute Stressed Risk                │              │
 │                   │                       │                      │── Detect SOE Breaches │                │              │
 │                   │                       │                      │── Formulate Bounds ──►│                │              │
 │                   │                       │                      │                       │── Solve QP ───►│              │
 │                   │                       │                      │                       │◄── Return w*───│              │
 │                   │                       │                      │── Validate Candidate w*───────────────►│              │
 │                   │                       │                      │◄── Certification (PASS/FAIL)───────────│              │
 │                   │                       │                      │── Persist Run & Snapshot─────────────────────────────►│
 │                   │                       │◄── Return JSON Resp──│                                                       │
 │                   │◄── Render Card & Diffs│                                                                              │
 │                   │                                                                                                      │
 │── Click "APPROVE"►│                                                                                                      │
 │                   │── POST /rebalance ───►│                                                                              │
 │                   │   {opt_id, approved}  │── Execute Holding Update ───────────────────────────────────────────────────►│
 │                   │                       │── Commit Audit Event ───────────────────────────────────────────────────────►│
 │                   │                       │◄── Return 200 OK ────│                                                       │
 │                   │◄── Show GREEN State ──│                                                                              │
```
