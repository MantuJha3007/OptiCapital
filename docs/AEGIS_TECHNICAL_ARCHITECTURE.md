# AEGIS: Technical Architecture & System Design

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Document Status:** Canonical Technical Architecture  
**Target Environments:** Native Python/Vite (Zero-Config SQLite) & Docker Multi-Container (PostgreSQL 16)  
**Automated Test Status:** 97/97 Pytest Unit & Integration Tests Passing  

---

## 1. System Overview & Architectural Topology

AEGIS is designed as a three-tier, service-oriented architecture with decoupled compute, state, and presentation layers, augmented by an embedded AI Copilot and Policy RAG intelligence layer.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: PRESENTATION                            │
│  React 18 + Vite SPA (TypeScript, Tailwind CSS v4, Recharts, Lucide)   │
│  - 6 Operational Views (Command Center, Contagion, Attribution,        │
│    Reverse Stress Lab, Portfolio & Capital, Audit & Outcomes)          │
│  - Floating AI Risk Copilot (Screen Context Aware)                     │
│  - Data Center Modal (Market Feeds & Policy Document RAG)              │
│  Port: 5173 (Development) / 80 (Production Nginx)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON REST API (22 Endpoints)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        TIER 2: APPLICATION & COMPUTE                   │
│  FastAPI (Python 3.11+) + Uvicorn ASGI Server                          │
│  - 14 Domain Service Engines                                           │
│  - Quantitative Math Engine (NumPy, SciPy, Pandas)                     │
│  - Convex Optimizer Engine (CVXPY with CLARABEL/OSQP/SCS)              │
│  - Independent Invariant Safety Validator (6 Gates)                    │
│  - AI Intelligence (Groq Llama-3.3-70B + Fiduciary Fallback)           │
│  - Policy RAG Engine (TF-IDF Vectorizer + Cosine Similarity)           │
│  - Pluggable Market Data Subsystem (Demo / CSV / Live)                 │
│  Port: 8000                                                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 (psycopg2 / sqlite3)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        TIER 3: PERSISTENCE & AUDIT                     │
│  PostgreSQL 16 (Docker) OR SQLite 3 (Local Development)                │
│  - 11 Core Normalized Relational Tables                                │
│  - Immutable Audit Trails (Snapshots, Runs, Rebalance Actions)         │
│  - Zero-Config Database File: opti_capital.db                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture (React + TypeScript)

### 2.1 Technology Stack
- **Build Engine & Dev Server:** Vite 8.x
- **Core Library:** React 18 / TypeScript (~6.0)
- **Styling Architecture:** Tailwind CSS v4 + Vanilla CSS custom properties (`frontend/src/index.css` design system)
- **Visualization:** Recharts 3.x (Pie, Bar, Line, Cell) & custom SVG radial risk gauges
- **Iconography:** Lucide-React

### 2.2 Component Hierarchy & Layout
```text
App.tsx
  └── Dashboard.tsx (Master Cockpit Controller)
        ├── Top Header Bar (Brand Identity, Capital Summary, Feed Badge, Liveness Dot)
        ├── Six-Tab Navigation Bar:
        │     ├── 1. Command Center ('control')
        │     │     ├── RiskGauge (180° SVG Radial Gauge, Score / 100, SOE Mode)
        │     │     ├── PortfolioSummaryCard (Valuation, Expected Return, Drawdown, Liquidity)
        │     │     ├── AllocationDonutChart (Recharts Pie Chart with Asset-Class Palette)
        │     │     ├── Stress Lab Module (Scenario Selector: Crash, Inflation, Tech, Normal)
        │     │     ├── Intervention & Recommendation Panel (Breaches, Proposed Weights Diff)
        │     │     ├── Financial Friction Summary (Turnover %, Estimated Fee ₹)
        │     │     ├── ValidationBadge (Independent Validator PASS/FAIL certification)
        │     │     └── Action Buttons ([APPROVE REBALANCE], [REJECT])
        │     ├── 2. Correlation Contagion ('contagion')
        │     │     ├── Normal vs Stressed Heatmap Matrix
        │     │     └── Contagion Shift Index Card
        │     ├── 3. Euler Risk Attribution ('attribution')
        │     │     ├── Capital Weight vs Risk Contribution Bar Chart
        │     │     ├── Primary Risk Driver Callout Card
        │     │     └── Marginal Risk Contribution (MCR) Table
        │     ├── 4. Reverse Stress Lab ('reverse')
        │     │     ├── Failure Threshold Slider (Default: 80.0 CRISIS)
        │     │     ├── Critical Shock Multiplier (α*) & Distance to Failure (DtF)
        │     │     ├── Capital Resilience Score (0–100)
        │     │     └── Parameter Shock Progression Curve
        │     ├── 5. Portfolio & Capital ('portfolio')
        │     │     ├── Asset Weight Sliders with Budget Normalization
        │     │     ├── Total Capital Input (₹50 L to ₹10 Cr)
        │     │     └── [APPLY REBALANCE] & [RESET TO ₹1 CR] Controls
        │     └── 6. Audit & Outcomes ('audit')
        │           ├── Chronological Decision History Table
        │           └── 5-Day Outcome Tracking (Capital Preserved, Loss Avoided ₹)
        ├── DataCenterModal.tsx
        │     ├── Market Provider Manager (Demo, CSV Upload with DB Persistence, Live Feed)
        │     └── Institutional Policy Manager (File Ingestion, Chunk Stats, RAG Test Search)
        └── FloatingCopilot.tsx
              ├── Docked Chat Window with Minimize/Expand
              ├── Screen Context Awareness Indicator
              ├── Policy Citations with Expandable Excerpts
              └── Fiduciary Synthesis Engine (Groq Llama-3.3-70B with Fallback)
```

### 2.3 State Management & API Client
- Master state is loaded via `api.getMasterState()` (`GET /api/state/master`) on initial load and following rebalance actions.
- All API interactions are typed in `frontend/src/api.ts` returning TypeScript promises matching schemas in `frontend/src/types.ts`.

---

## 3. Backend Architecture (FastAPI + Python)

### 3.1 Design Pattern: Layered Domain Services
The backend is structured to strictly isolate HTTP routing, financial mathematics, persistence, and AI orchestration:

```text
[HTTP Request]
     │
     ▼
[API Router Layer] (app/api/*.py)
  - Validates schemas via Pydantic v2 (app/schemas/*.py)
  - Injects database session via FastAPI Depends(get_db)
  - Catches domain exceptions and maps them to HTTP status codes
     │
     ▼
[Domain Service Layer] (app/services/*.py)
  - Pure Python domain orchestrators
  - Coordinates quantitative pipelines and persistence
     │
     ▼
[Quant Core & Optimization] (app/core/, cvxpy, numpy, scipy)
  - Covariance calculation, VaR/CVaR, Euler risk attribution
  - Convex quadratic programming solver (CLARABEL / OSQP / SCS)
     │
     ▼
[Persistence Layer] (app/models/*.py, SQLAlchemy 2.0)
  - Supports SQLite (zero-config) and PostgreSQL 16 (docker)
  - Append-only immutable audit ledgers
```

### 3.2 Service Catalog
1. **`portfolio_service.py`**: Portfolio loading, asset vectors, updates, resets.
2. **`market_data_service.py`**: Price returns, historical volatility, asset covariance matrices.
3. **`risk_engine.py`**: 6 core metrics, VaR/CVaR, composite risk score (0–100), snapshot creation.
4. **`control_engine.py`**: Safe Operating Envelope evaluation, limit breaches, anti-chattering hysteresis.
5. **`optimizer.py`**: Minimum-intervention CVXPY quadratic programming with Euclidean tracking.
6. **`validator.py`**: Independent invariant safety verification (6 checks).
7. **`risk_attribution.py`**: Euler marginal and percentage risk decomposition.
8. **`scenario_engine.py`**: Forward stress testing and recommendation pipeline.
9. **`reverse_stress.py`**: Reverse stress sweep, critical shock multiplier $\alpha^*$, Distance to Failure.
10. **`rebalancer.py`**: Human approval processing and database state transition.
11. **`regime_service.py`**: Market regime classification (Calm, Stressed, Transition).
12. **`contagion_service.py`**: Cross-asset correlation contagion matrices.
13. **`prediction_service.py`**: EWMA volatility forecasting and breach probabilities.
14. **`learning_service.py`**: 5-day simulated outcome tracking.
15. **`document_service.py`**: Policy ingestion, chunking, and index management.
16. **`rag_service.py`**: In-memory TF-IDF cosine similarity RAG retrieval.
17. **`copilot_service.py`**: Institutional AI risk copilot orchestration and intent routing.
18. **`llm_service.py`**: Groq Llama-3.3-70B API client with fallback handler.
19. **`market_data/`**: Pluggable provider package (`Demo`, `CSV`, `Live`, `Manager`).

---

## 4. Quantitative Formulation & Optimization

### 4.1 Safe Operating Envelope Zones & Hysteresis
```text
Score:  0 ────────── 30 ────────── 60 ────────── 80 ────────── 100
        [   GREEN   ] [   YELLOW   ] [   ORANGE   ] [    RED     ]
            SAFE         CAUTION        WARNING         CRISIS
            HOLD        ADVISORY       REBALANCE      PROTECTION
```
- **Hysteresis Buffer:** Returning from a higher to lower risk zone requires clearing $\delta = 3.0$ below the boundary (e.g., exiting YELLOW to GREEN requires $S \le 27.0$).

### 4.2 Minimum-Intervention Quadratic Program
$$\min_{w \in \mathbb{R}^N} \quad \frac{1}{2} \|w - w_0\|_2^2 + \gamma \sum_{i=1}^N |w_i - w_{0,i}| + \lambda w^T \Sigma w - \kappa w^T \mu$$

Subject to:
$$\sum_{i=1}^N w_i = 1.0, \quad w_i \ge 0, \quad w_{\text{equity}} \le \text{MaxEquity}_{\text{zone}}, \quad w_{\text{cash}} \ge \text{MinCash}_{\text{zone}}$$

### 4.3 Independent Safety Gates
Every candidate portfolio produced by the optimizer must satisfy:
1. $|\sum w_i - 1.0| \le 10^{-4}$ (Budget sum)
2. $w_i \ge -10^{-6} \quad \forall i$ (Long-only)
3. $w_{\text{equity}} \le \text{MaxEquity}_{\text{zone}} + 10^{-4}$ (Equity ceiling)
4. $w_{\text{cash}} \ge \text{MinCash}_{\text{zone}} - 10^{-4}$ (Cash floor)
5. $\max_i(w_i) \le 0.50 + 10^{-4}$ (Single asset concentration)
6. $\sqrt{w^T \Sigma w} \le \sigma_{\max,\text{zone}} + 10^{-4}$ (Volatility ceiling)

---

## 5. Persistence Architecture

- **PostgreSQL 16** (production) and **SQLite 3** (local zero-config) via SQLAlchemy 2.0.
- 11 normalized tables ensuring full auditability of all assessments, breaches, and rebalances.
- Append-only audit integrity ensures historical states can be reconstructed at any point in time.
