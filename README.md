# AEGIS: Adaptive Capital Resilience & Risk-Control System

> **A closed-loop financial risk-control and supervisory decision-support system engineered for capital preservation under macroeconomic and liquidity stress.**

⚠️ **OPERATIONAL BOUNDARY:** *This system is an institutional simulation and supervisory decision-support platform. It does NOT connect to live brokerage execution gateways or execute real monetary transactions.*

---

## 1. Executive Summary

Traditional portfolio management treats optimization as an open-loop mathematical calculation—continually chasing theoretical "optimal" weights, triggering excessive turnover, incurring heavy transaction drag, and failing when crisis correlations converge to 1.0.

**AEGIS reframes capital allocation as a closed-loop control system:**
1. **Observe & Measure:** Continuously tracks portfolio valuation, volatility, maximum drawdown, concentration (HHI), and liquidity.
2. **Safe Operating Envelope (SOE):** Evaluates risk scores against dynamically parameterized zones (**GREEN**, **YELLOW**, **ORANGE**, **RED**) with anti-chattering hysteresis.
3. **Diagnose (Risk Attribution):** Pinpoints the precise asset-level drivers of risk ($MCAR_i$) when stress emerges.
4. **Minimum Necessary Intervention:** Formulates the smallest feasible portfolio adjustment using CVXPY quadratic programming that restores compliance while penalizing portfolio turnover and transaction costs.
5. **Independent Certification:** Validates candidate allocations through a decoupled verification layer before human review.
6. **Reverse Stress Testing (The WOW Feature):** Calculates the portfolio's exact **Distance to Failure (DtF)** by searching backward to find the minimum market shock that breaches survival boundaries.
7. **Institutional Audit:** Persists 100% of assessments, breaches, optimizer inputs, candidate weights, and human approvals in PostgreSQL.

---

## 2. Architecture Overview

```text
                         AEGIS
          Adaptive Capital Resilience
             & Risk-Control System
                         │
                         ▼
                  Portfolio State
                         │
                         ▼
                   Risk Engine
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       Risk Attribution       Scenario Engine
                                    │
                                    ▼
                            Stress Testing
                                    │
              ┌─────────────────────┘
              ▼
                Safe Operating Envelope
                  GREEN / YELLOW /
                  ORANGE / RED
                         │
                         ▼
                   Control Engine
                         │
                         ▼
              Minimum-Intervention
                  CVXPY Optimizer
                         │
                         ▼
                 Transaction Cost
                         │
                         ▼
                Independent Validator
                         │
                         ▼
                   Human Approval
                         │
                         ▼
                Simulated Rebalance
                         │
                         ▼
                  Risk Recalculation
                         │
                         ▼
                   Stress Re-test
                         │
                         ▼
                Reverse Stress Test
                         │
                         ▼
                  Failure Boundary
                         │
                         ▼
                 PostgreSQL Audit
                         │
                         ▼
              Dashboard + Explanation
```

---

## 3. Technology Stack

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide-React | Real-time risk dashboard, stress lab, and decision UI |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 | REST API gateway, service orchestration, async lifespan |
| **Math & Optimization** | NumPy, SciPy, Pandas, CVXPY (CLARABEL / OSQP / SCS) | Convex quadratic programming, matrix math, risk formulas |
| **Persistence & Audit** | PostgreSQL 16, SQLAlchemy 2.0, Alembic | 11 relational tables, immutable snapshots, audit ledgers |
| **Infrastructure** | Docker, Docker Compose | Multi-container isolated local deployment |

---

## 4. Documentation Index

The repository features comprehensive, production-grade technical documentation in [`docs/`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs):

- 📘 **[AEGIS_FINAL_PRODUCT_SPECIFICATION.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_FINAL_PRODUCT_SPECIFICATION.md)** — Canonical master specification covering all 34 functional and mathematical areas.
- 🏗️ **[AEGIS_TECHNICAL_ARCHITECTURE.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_TECHNICAL_ARCHITECTURE.md)** — Deep technical blueprint detailing frontend, backend, optimizer, and database topology.
- 🗺️ **[AEGIS_MODULE_MAP.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_MODULE_MAP.md)** — Concrete mapping of every system capability to actual repository files.
- 🛣️ **[AEGIS_IMPLEMENTATION_ROADMAP.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_IMPLEMENTATION_ROADMAP.md)** — Phased milestone plan prioritizing the core working loop over optional extensions.
- 📊 **[AEGIS_IMPLEMENTATION_STATUS.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_IMPLEMENTATION_STATUS.md)** — Honest, reality-checked status tracker of what is operational vs planned.
- ⚖️ **[AEGIS_ARCHITECTURE_DECISIONS.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_ARCHITECTURE_DECISIONS.md)** — Formal Architecture Decision Records (ADRs 1–10).
- 🎬 **[AEGIS_DEMO_FLOW.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_DEMO_FLOW.md)** — Minute-by-minute 23-step script and judge Q&A defense.
- 🔌 **[docs/api.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/api.md)** — REST API contracts, schemas, and payload examples.
- 💾 **[docs/database.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/database.md)** — PostgreSQL 11-table schema, index strategy, and audit principles.
- 📐 **[docs/financial-model.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/financial-model.md)** — Mathematical formulations, Euler risk decomposition, and solver equations.

---

## 5. Quick Start & Local Setup

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (for local backend development)
- Node.js 18+ and npm (for local frontend development)

---

### Method A: Full Docker Compose (Recommended)

```bash
# 1. Clone repository and navigate to root
cd OptiCapital

# 2. Launch multi-container stack (PostgreSQL, Backend, Frontend)
docker compose up -d

# 3. Seed database with demo portfolio, assets, and market data
docker compose exec backend python -m app.seed.seed_database
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API & Swagger Docs:** `http://localhost:8000/docs`
- **PostgreSQL Database:** `localhost:5432` (`opti_capital`)

---

### Method B: Native Local Development

#### Step 1: Start PostgreSQL
```bash
docker compose up -d postgres
```

#### Step 2: Setup & Run Backend
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows (PowerShell/CMD)
# source venv/bin/activate # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Seed database with demo data (idempotent)
python -m app.seed.seed_database

# Start FastAPI server with live reload
uvicorn app.main:app --reload --port 8000
```

#### Step 3: Setup & Run Frontend
```bash
cd ../frontend

# Install node dependencies
npm install

# Start Vite dev server
npm run dev
```

---

## 6. Hackathon Demo Flow (3 Minutes)

The presentation follows a 5-phase story:
1. **Healthy State (0:00 - 0:30):** Show ₹1.00 Cr capital in **SAFE (GREEN)** mode. AEGIS suppresses unnecessary trading.
2. **The Shock (0:30 - 1:00):** Run **Market Crash** scenario (-30% Equity). Risk jumps to **84.6 (CRISIS / RED)**. Show threshold breaches.
3. **Diagnosis & Control (1:00 - 1:45):** Risk Attribution reveals Equity is driving 91% of risk. CVXPY calculates the **minimum intervention** (Equity 38% $\to$ 20%, Cash 6% $\to$ 20%, turnover 18.5%, cost ₹3,520). Independent Validator certifies **PASS**.
4. **Approval & Reverse Stress (1:45 - 2:30):** Click **[APPROVE REBALANCE]**. Score drops to **26.1 (GREEN)**. Trigger **Reverse Stress Testing** to prove that the portfolio's **Distance to Failure** expanded from 8% to 28%.
5. **Audit Ledger (2:30 - 3:00):** Show immutable PostgreSQL history logging every calculation and approval.

*See [`docs/AEGIS_DEMO_FLOW.md`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_DEMO_FLOW.md) for word-for-word pitch narration and judge Q&A.*

---

## 7. Core REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & database connection probe |
| `GET` | `/api/portfolio` | Retrieve portfolio valuation, cash, and holdings |
| `GET` | `/api/risk` | Compute risk metrics & persist immutable snapshot |
| `GET` | `/api/risk/attribution` | Euler marginal risk contribution per asset (Planned P1) |
| `GET` | `/api/scenarios` | List stress scenarios and asset shock vectors |
| `POST` | `/api/scenarios/run` | Execute forward stress simulation & dynamic control |
| `POST` | `/api/stress/reverse` | Reverse stress test sweep & Distance to Failure (Planned P1) |
| `POST` | `/api/optimize` | Run standalone minimum-intervention CVXPY optimizer |
| `POST` | `/api/validate` | Independently validate candidate allocation (Planned P0) |
| `POST` | `/api/rebalance` | Approve / reject rebalance & update simulated holdings |
| `GET` | `/api/rebalance/history`| Chronological audit log of all rebalance decisions |

---

## 8. Verification & Testing

```bash
cd backend
pytest tests/ -v
```

Tests validate core financial invariants:
- **Budget Sum:** $\sum w_i = 1.0 \pm 10^{-5}$
- **Long-Only:** $w_i \ge 0 \quad \forall i$
- **Risk Invariant:** Stressed rebalance reduces portfolio volatility
- **Turnover & Cost:** $T \ge 0$, $C_{\text{txn}} \ge 0$
- **Audit Integrity:** Decisions persist to PostgreSQL without mutation

---

## 9. License & Disclaimer

This project is developed for hackathon evaluation and academic demonstration purposes only. It is not financial advice and is not intended for production trading execution.
