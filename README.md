# AEGIS: Adaptive Capital Resilience & Risk-Control System

> **A closed-loop financial risk-control and supervisory decision-support system engineered for institutional capital preservation under macroeconomic and liquidity stress.**

⚠️ **OPERATIONAL BOUNDARY:** *This system is an institutional simulation and supervisory decision-support platform. It does NOT connect to live brokerage execution gateways or execute real monetary transactions.*

---

## 1. Executive Summary

Traditional portfolio management treats optimization as an open-loop mathematical calculation—continually chasing theoretical "optimal" weights, triggering excessive turnover, incurring heavy transaction drag, and failing when crisis correlations converge to 1.0.

**AEGIS reframes capital allocation as a closed-loop control system:**

1. **Observe & Measure:** Continuously tracks portfolio valuation, volatility, maximum drawdown, concentration (HHI), liquidity ratio, Value at Risk ($\text{VaR}_{95}$), and Conditional Value at Risk ($\text{CVaR}_{95}$).
2. **Safe Operating Envelope (SOE):** Evaluates risk scores against dynamically parameterized zones (**GREEN**, **YELLOW**, **ORANGE**, **RED**) with anti-chattering hysteresis ($\delta = 3.0$).
3. **Diagnose (Euler Risk Attribution):** Pinpoints the precise asset-level drivers of risk ($\text{MCR}_i$ and $\text{PRC}_i$) when stress emerges.
4. **Contagion Lens:** Contrasts normal cross-asset correlations against stressed correlations to reveal diversification breakdown.
5. **Minimum Necessary Intervention:** Formulates the smallest feasible portfolio adjustment using CVXPY quadratic programming that restores compliance while penalizing portfolio turnover and transaction costs.
6. **Independent Certification:** Decoupled safety validator checks 6 strict mathematical and institutional invariants before presenting recommendations to human decision-makers.
7. **Reverse Stress Testing:** Calculates the portfolio's exact **Distance to Failure (DtF)** by searching backward to find the critical shock multiplier $\alpha^*$ that breaches survival boundaries.
8. **Institutional AI Copilot & Policy RAG:** Answers fiduciary inquiries with screen context awareness and cites firm policy documents (powered by Groq `llama-3.3-70b-versatile` with an automatic deterministic fiduciary fallback).
9. **Institutional Audit & Surveillance:** Persists 100% of assessments, breaches, optimizer inputs, candidate weights, and human approvals in PostgreSQL/SQLite, with forward 5-day outcome tracking.

---

## 2. Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     THE AEGIS CLOSED LOOP                                       │
│                                                                                                 │
│   [Market Data Feeds] ──► [Portfolio State] ──► [Quantitative Risk Engine]                      │
│   (Demo / CSV / Live)      (₹1 Cr Holdings)      (6 Core Metrics + VaR/CVaR)                    │
│                                                              │                                  │
│                                                              ▼                                  │
│                                                   [Regime & Contagion Lens]                     │
│                                                   (Calm/Stressed Correlation)                   │
│                                                              │                                  │
│                                                              ▼                                  │
│                                                  [Safe Operating Envelope]                      │
│                                                  (GREEN / YELLOW / ORANGE / RED)                │
│                                                              │                                  │
│          ┌───────────────────────────────────────────────────┴───────────────────────┐          │
│          ▼                                                                           ▼          │
│   [Forward Stress Engine]                                                     [Control Engine]  │
│   (-30% Crash / Inflation)                                                    (Detect Breaches) │
│          │                                                                           │          │
│          └───────────────────────────────────┬───────────────────────────────────────┘          │
│                                              ▼                                                  │
│                                 [Euler Risk Attribution]                                        │
│                                 (Marginal Risk Contribution)                                    │
│                                              │                                                  │
│                                              ▼                                                  │
│                              [Minimum-Intervention Optimizer]                                   │
│                              (CVXPY Quadratic Program + L1 Fee Drag)                            │
│                                              │                                                  │
│                                              ▼                                                  │
│                                   [Independent Validator]                                       │
│                                   (6 Invariant Safety Gates)                                    │
│                                              │                                                  │
│                                              ▼                                                  │
│                            [AI Copilot & Policy RAG Retrieval]                                  │
│                            (Groq Llama-3.3-70B + Fiduciary Fallback)                            │
│                                              │                                                  │
│                                              ▼                                                  │
│                                    [Human-in-the-Loop]                                          │
│                                 [APPROVE] / [REJECT] Rebalance                                  │
│                                              │                                                  │
│                                              ▼                                                  │
│                                    [Reverse Stress Lab]                                         │
│                                (Distance to Failure α* & DtF)                                   │
│                                              │                                                  │
│                                              ▼                                                  │
│                                  [Immutable PostgreSQL Audit]                                   │
│                                  (& 5-Day Outcome Surveillance)                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technologies | Role |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide-React | 6 operational tabs, floating copilot, data center modal, real-time risk gauge |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 | REST API gateway, service orchestration, lifespan lifecycle |
| **Quantitative Math** | NumPy, SciPy, Pandas, CVXPY (CLARABEL / OSQP / SCS) | Convex quadratic programming, matrix operations, Euler risk decomposition, VaR |
| **AI & Intelligence** | Groq API (`llama-3.3-70b-versatile`), TF-IDF Cosine RAG | Screen-context risk manager copilot, document RAG, deterministic fallback |
| **Persistence & Audit**| PostgreSQL 16 / SQLite 3, SQLAlchemy 2.0 | 11 relational tables, immutable snapshots, audit ledgers, dual compatibility |
| **Infrastructure** | Docker, Docker Compose | Multi-container isolated local deployment |

---

## 4. Operational Cockpit Views

The UI is divided into **6 specialized tabs**, plus an integrated **Data Center Modal** and a **Floating AI Copilot**:

1. 🛡️ **Command Center:** Real-time risk gauge (0–100), Safe Operating Envelope status, asset allocation donut, macro stress testing, dynamic intervention proposals, and human approval workflow.
2. 🕸️ **Correlation Contagion:** Side-by-side normal vs stressed correlation heatmaps and contagion expansion index ($C_{\text{contagion}}$).
3. 📊 **Euler Risk Attribution:** Breakdown of Marginal Risk Contribution ($\text{MCR}_i$) and Percentage Risk Contribution ($\text{PRC}_i$) identifying primary risk drivers.
4. 🔬 **Reverse Stress Lab:** Critical shock multiplier ($\alpha^*$), interactive failure threshold slider, and Distance to Failure (DtF) parameter curves.
5. ⚖️ **Portfolio & Capital:** Live asset weight adjustment sliders, capital scalability controls (e.g. ₹50 Lakhs vs ₹10 Crores), and manual rebalance triggers.
6. 📜 **Audit & Outcomes:** Immutable compliance decision ledger and 5-day simulated outcome tracking (Verified Capital Preserved, Loss Avoided ₹).
7. 🏢 **Data Center Modal:** Market feed provider manager (Synthetic Demo, CSV upload & DB persistence, Live feed stub) and Institutional Policy RAG document manager.
8. 🤖 **Floating AI Copilot:** Screen-context-aware institutional conversational assistant with regulatory policy citations and automatic deterministic fiduciary fallback.

---

## 5. Documentation Index

The repository features comprehensive, production-grade technical documentation:

- 🏛️ **[CURRENT_SYSTEM_ARCHITECTURE.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/CURRENT_SYSTEM_ARCHITECTURE.md)** — **Authoritative Single Source of Truth** detailing current codebase, architecture, services, and quant logic.
- 📘 **[docs/AEGIS_FINAL_PRODUCT_SPECIFICATION.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_FINAL_PRODUCT_SPECIFICATION.md)** — Master institutional product specification.
- 🏗️ **[docs/AEGIS_TECHNICAL_ARCHITECTURE.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_TECHNICAL_ARCHITECTURE.md)** — Deep technical blueprint detailing frontend, backend, optimizer, and database topology.
- 🗺️ **[docs/AEGIS_MODULE_MAP.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_MODULE_MAP.md)** — Concrete mapping of every system capability to actual repository files.
- 📊 **[docs/AEGIS_IMPLEMENTATION_STATUS.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_IMPLEMENTATION_STATUS.md)** — Reality-checked status tracker of operational components and test results.
- ⚖️ **[docs/AEGIS_ARCHITECTURE_DECISIONS.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_ARCHITECTURE_DECISIONS.md)** — Architecture Decision Records (ADRs 1–10).
- 🎬 **[docs/AEGIS_DEMO_FLOW.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_DEMO_FLOW.md)** — Minute-by-minute 23-step script and judge Q&A defense.
- 🔌 **[docs/api.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/api.md)** — Complete REST API contracts, schemas, and payload examples.
- 💾 **[docs/database.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/database.md)** — Database schema, relationships, and audit principles.
- 📐 **[docs/financial-model.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/financial-model.md)** — Mathematical formulations, Euler risk decomposition, VaR, and solver equations.

---

## 6. Quick Start & Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker & Docker Compose for PostgreSQL
- (Optional) Groq API Key for live Llama-3.3-70B responses (system operates with complete fiduciary fallback if omitted)

---

### Option A: Zero-Config Local Setup (Native)

The backend defaults to SQLite (`sqlite:///./opti_capital.db`) if no `DATABASE_URL` is set, allowing instant local startup without running Docker or configuring PostgreSQL.

#### Step 1: Setup & Run Backend
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows (PowerShell/CMD)
# source venv/bin/activate # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Seed database with demo data (idempotent, creates opti_capital.db)
python -m app.seed.seed_database

# Run full test suite (97 tests)
python -m pytest tests/ -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### Step 2: Setup & Run Frontend
```bash
cd ../frontend

# Install node dependencies
npm install

# Start Vite dev server
npm run dev
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API & Swagger Docs:** `http://localhost:8000/docs`
- **Interactive ReDoc:** `http://localhost:8000/redoc`

---

### Option B: Docker Compose (PostgreSQL)

```bash
# 1. Clone repository and navigate to root
cd OptiCapital

# 2. Launch multi-container stack
docker compose up -d

# 3. Seed database with demo portfolio, assets, and market data
docker compose exec backend python -m app.seed.seed_database
```

- **Frontend:** `http://localhost:5173`
- **Backend:** `http://localhost:8000/docs`
- **PostgreSQL:** `localhost:5432` (`opti_capital`)

---

## 7. Environment Variables

Configure via a `.env` file in the `backend/` directory or export in your environment:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///./opti_capital.db` | SQLAlchemy database URL. Use `postgresql://user:pass@localhost:5432/opti_capital` for PostgreSQL. |
| `GROQ_API_KEY` | `""` (Empty string) | Groq API key for Llama-3.3-70B inference. Falls back to deterministic fiduciary response if omitted. |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Groq model identifier. |
| `MARKET_DATA_PROVIDER` | `demo` | Active market feed provider (`demo`, `csv`, `live`). |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated list of allowed CORS origins. |

---

## 8. Hackathon Demo Flow (3 Minutes)

The presentation follows a 5-phase story:
1. **Healthy State (0:00 - 0:30):** Show ₹1.00 Cr capital in **SAFE (GREEN)** mode. AEGIS suppresses unnecessary trading.
2. **The Shock (0:30 - 1:00):** Run **Market Crash** scenario (-30% Equity). Risk jumps to **84.6 (CRISIS / RED)**. Show threshold breaches.
3. **Diagnosis & Control (1:00 - 1:45):** Euler Risk Attribution reveals Equity is driving 91% of risk. CVXPY calculates the **minimum intervention** (Equity 38% $\to$ 20%, Cash 6% $\to$ 20%, turnover 18.5%, cost ₹3,520). Independent Validator certifies **PASS**.
4. **Approval & Reverse Stress (1:45 - 2:30):** Click **[APPROVE REBALANCE]**. Score drops to **26.1 (GREEN)**. Trigger **Reverse Stress Testing** to prove that the portfolio's **Distance to Failure** expanded from 8.2% to 28.4%.
5. **Audit Ledger & Copilot (2:30 - 3:00):** Show immutable PostgreSQL history logging every calculation and approval. Ask the Floating Copilot about regulatory policy compliance and observe policy citations.

*See [`docs/AEGIS_DEMO_FLOW.md`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_DEMO_FLOW.md) for word-for-word pitch narration and judge Q&A.*

---

## 9. Core REST API Endpoints

All 22 endpoints are fully operational:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & database connection probe |
| `GET` | `/api/state/master` | Unified single-call institutional master state payload |
| `GET` | `/api/portfolio` | Retrieve portfolio valuation, cash, and holdings |
| `POST` | `/api/portfolio/update` | Update capital or asset weights dynamically |
| `POST` | `/api/portfolio/reset` | Reset portfolio to default ₹1 Cr baseline |
| `GET` | `/api/risk` | Compute risk metrics & persist immutable snapshot |
| `GET` | `/api/risk/attribution` | Euler marginal risk contribution ($\text{MCR}_i, \text{PRC}_i$) |
| `GET` | `/api/scenarios` | List stress scenarios and asset shock vectors |
| `POST` | `/api/scenarios/run` | Execute forward stress simulation & dynamic control |
| `POST` | `/api/stress/reverse` | Reverse stress test sweep & Distance to Failure (DtF) |
| `POST` | `/api/optimize` | Run standalone minimum-intervention CVXPY optimizer |
| `GET` | `/api/optimization` | List recent optimization runs and solver results |
| `POST` | `/api/rebalance` | Approve / reject rebalance & update simulated holdings |
| `GET` | `/api/rebalance/history`| Chronological audit log of all rebalance decisions |
| `GET` | `/api/market/regime` | Market regime classification (Calm, Stressed, Transition) |
| `GET` | `/api/market/contagion` | Cross-asset correlation contagion heatmaps |
| `GET` | `/api/market/provider` | Active market feed provider status |
| `POST` | `/api/market/provider` | Switch active market provider (`demo`, `csv`, `live`) |
| `POST` | `/api/market/upload-csv`| Ingest external OHLC price CSV with DB persistence |
| `POST` | `/api/rag/query` | RAG semantic search across compliance policy documents |
| `GET` | `/api/documents` | List indexed policy documents and chunk stats |
| `POST` | `/api/documents/upload`| Upload policy document (PDF, DOCX, MD) |
| `DELETE`| `/api/documents/{id}` | Delete policy document from RAG index |
| `POST` | `/api/risk-manager/chat`| AI Copilot conversational chat with screen context |
| `GET` | `/api/copilot/context` | Raw Copilot context string passed to LLM |
| `GET` | `/api/audit/outcomes` | 5-day simulated outcome tracking & loss avoided |

---

## 10. Verification & Testing

```bash
cd backend
venv\Scripts\python -m pytest tests/ -v
```

**Results:** `97 passed in 20.43s` across 15 test suites:
- **Budget Sum:** $\sum w_i = 1.0 \pm 10^{-4}$
- **Long-Only:** $w_i \ge 0 \quad \forall i$
- **Risk Invariant:** Stressed rebalance reduces portfolio volatility
- **Turnover & Cost:** $T \ge 0$, $C_{\text{txn}} \ge 0$
- **Audit Integrity:** Decisions persist to database without mutation
- **Euler Decomposition:** $\sum \text{ARC}_i = \sigma_p$, $\sum \text{PRC}_i = 1.0$
- **Reverse Stress:** DtF expands after defensive rebalance
- **Copilot Fiduciary Fallback:** 100% test pass rate even without Groq API key

---

## 11. License & Disclaimer

This project is developed for hackathon evaluation and academic demonstration purposes only. It is not financial advice and is not intended for production trading execution.
