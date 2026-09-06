# 🛡️ AEGIS: Adaptive Capital Resilience & Risk-Control System

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18%2F19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6.svg?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![CVXPY](https://img.shields.io/badge/Optimizer-CVXPY%201.9%2B-orange.svg)](https://www.cvxpy.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tests](https://img.shields.io/badge/Tests-117%20Passed-10b981.svg)](https://pytest.org)
[![Regulatory](https://img.shields.io/badge/Compliance-Basel%20III%20%2F%20SEBI%20Aligned-indigo.svg)](docs/financial-model.md)

**A closed-loop financial risk-control and supervisory decision-support platform engineered for capital preservation under macroeconomic and liquidity stress.**

[Live Interactive Demo (http://localhost:5173)](#quick-start--local-setup) • [3-Minute Pitch Script](docs/AEGIS_DEMO_FLOW.md) • [Financial Model & Proofs](docs/financial-model.md) • [Architecture Blueprint](docs/AEGIS_TECHNICAL_ARCHITECTURE.md)

</div>

---

> ⚠️ **OPERATIONAL & REGULATORY BOUNDARY:**  
> *AEGIS is an institutional simulation, supervisory stress-testing, and decision-support platform. It enforces mandatory human-in-the-loop sign-offs and does NOT connect to live retail brokerages or execute unconstrained monetary transactions.*

---

## 1. Executive Summary: The Closed-Loop Paradigm Shift

Traditional portfolio management relies on **open-loop** mathematical optimization (Markowitz Mean-Variance Optimization). Under crisis conditions, open-loop systems suffer from three fatal flaws:
1. **Estimation Error Maximization:** Inverting ill-conditioned covariance matrices assigns extreme, unstable weights to noisy outliers.
2. **Excessive Turnover & Friction:** Minor return fluctuations cause continual rebalancing churn, eroding capital through transaction drag.
3. **Correlation Convergence Blindness:** Diversification breaks down precisely when needed most—crisis asset correlations converge to 1.0.

### The AEGIS Solution: Closed-Loop Capital Protection

AEGIS reframes capital allocation as a **cybernetic supervisory control system**:

```text
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                              AEGIS GOVERNANCE LOOP                                    │
 │                                                                                        │
 │    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
 │    │  01. DETECT  │ ──► │ 02. DIAGNOSE │ ──► │  03. DECIDE  │ ──► │  04. DEFEND  │    │
 │    │ Multi-factor │     │ Euler Risk   │     │ Rule-Engine  │     │ CVXPY Min-   │    │
 │    │ Covariance & │     │ Attribution  │     │ Dynamic Cap  │     │ Turnover     │    │
 │    │ SOE Breaches │     │  (MCAR_i)    │     │ Tightening   │     │ Intervention │    │
 │    └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘    │
 │           ▲                                                              │            │
 │           │                     05. LEARN & AUDIT                        │            │
 │           │          Cryptographic PostgreSQL Audit Ledger               ▼            │
 │           └─────────────────────────────────────────────────── [HUMAN OFFICER SIGN-OFF]
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Observe & Measure:** Continuously evaluates valuation, volatility, historical drawdown, HHI concentration, and $T+0$ liquidity buffers.
2. **Safe Operating Envelope (SOE):** Tracks multi-factor risk scores against dynamic zones (**GREEN: Normal**, **YELLOW: Advisory**, **ORANGE: Defensive**, **RED: Capital Guard**) with anti-chattering hysteresis.
3. **Diagnose via Euler Attribution:** Pinpoints the exact asset sleeves driving disproportionate risk ($MCAR_i$) using marginal Euler variance decomposition.
4. **Minimum Necessary Intervention:** Uses CVXPY quadratic programming to formulate the smallest allocation adjustment restoring safety boundaries while strictly penalizing portfolio turnover and transaction friction.
5. **Reverse Stress Testing (The WOW Feature):** Inverts stress testing to compute the exact **Distance to Failure (DtF)**—finding the minimal shock vector that breaches capital boundaries.
6. **Institutional AI Copilot & Knowledge RAG:** Contextual LLM assistant that explains decisions and cites uploaded regulatory/corporate policies.
7. **Immutable Audit Ledger:** Commits 100% of risk assessments, optimizer inputs, candidate weights, and human sign-offs to PostgreSQL.

---

## 2. Core Engines & Capabilities

| Engine / Capability | Mathematical Formulation | Institutional Function |
| :--- | :--- | :--- |
| **Safe Operating Envelope (SOE)** | $R(t) = w_1 \sigma_{\text{port}} + w_2 \text{MDD} + w_3 \text{HHI} + w_4 (1 - L)$ | 4-zone regime status with hysteresis thresholds preventing rebalance oscillation. |
| **Euler Risk Attribution** | $RC_i = w_i \cdot \frac{(\Sigma w)_i}{\sigma_{\text{port}}}, \quad \sum RC_i = \sigma_{\text{port}}$ | Decomposes portfolio volatility into exact asset contributions; identifies toxic concentration. |
| **Minimum-Intervention Optimizer** | $\min_{w} (w^\top \Sigma w) + \lambda_{\text{turn}} \|w - w_0\|_1 + \lambda_{\text{cost}} C(w, w_0)$ | Solves convex QP to restore safe boundaries while minimizing turnover drag. |
| **Reverse Stress Testing (RST)** | $\min_s s^\top \Sigma^{-1} s \quad \text{s.t.} \quad w^\top s \le -\text{Loss}_{\text{crit}}$ | Calculates Mahalanobis Distance to Failure ($D_M$) to identify the most plausible path to ruin. |
| **Contagion Network Topology** | $A_{ij} = \rho_{ij} \cdot \mathbf{1}_{\|\rho_{ij}\| > \theta}$ | Force-directed D3 network modeling cross-asset contagion transmission channels. |
| **AI Copilot & Policy RAG** | Vector Similarity + Document Chunking | Live institutional intelligence assistant citing corporate and SEBI regulatory guidelines. |

---

## 3. Feasibility, Viability & Quantifiable Business Impact

### Technical & Operational Feasibility
- **Deterministic & Millisecond Execution:** Solves convex quadratic programs using industry-standard solvers (**Clarabel, OSQP, SCS**) in **$<45\text{ ms}$** with guaranteed global optima ($O(N^3)$ polynomial complexity).
- **Zero Black-Box Fragility:** Avoids unstable deep reinforcement learning; every recommendation is backed by closed-form Euler attribution and auditable convex mathematics.
- **Regulatory Alignment:** Built for supervisory compliance with **Basel III, SEBI, and FINRA** governance frameworks, requiring human authorization before committing rebalance actions.

### Quantifiable Business & Financial Impact

```
  Traditional MVO vs. AEGIS Closed-Loop Protection
  ─────────────────────────────────────────────────────────────────────────────
  Metric                            Traditional MVO      AEGIS Capital Guard
  ─────────────────────────────────────────────────────────────────────────────
  Turnover Friction                 High (35-65% churn)  Min-Intervention (12-18%)
  Tail Drawdown Prevention          Unconstrained        60%+ Drawdown Mitigation
  Distance to Failure (DtF)         Unknown / Blind      0.94σ → >2.8σ (+200% Buffer)
  Audit & Forensic Cycle            3-5 Business Days    <50 Milliseconds (Live Log)
  Transaction Slippage Savings      Baseline             15 to 35 bps / year
  ─────────────────────────────────────────────────────────────────────────────
```

---

## 4. System Architecture

```text
                                  AEGIS FRONTEND
                         React 18 + Vite + Tailwind CSS
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
   Landing Page & Demo       5-Tab Terminal Canvas      Institutional Copilot
   - Interactive Simulator   - Command Center           - RAG Policy Drawer
   - Value Matrix            - Portfolio Intelligence   - Audit Explanations
   - Dual Navigation         - Contagion Lab            - Contextual Citations
                             - Stress & RST Lab
                             - Decision History
                                       │
                                       ▼ HTTP / REST (Vite Proxy)
                                  BACKEND API
                          FastAPI + Pydantic v2 + Uvicorn
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
       Risk Engine              Optimizer Service          Data & Ingestion
       - SOE Hysteresis         - CVXPY Solver             - CSV Market Data
       - Euler Decomposition    - Clarabel / OSQP          - Document Service
       - Contagion Topology     - Turnover Penalty         - Vector Chunking
       - Reverse Stress Sweep   - Independent Validator    - Groq LLM Client
                                       │
                                       ▼ SQLAlchemy 2.0
                               POSTGRESQL DATABASE
                            11 Relational Tables & Audit
```

---

## 5. Quick Start & Local Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Docker** (for PostgreSQL database)

---

### Step 1: Start PostgreSQL (Docker)
```bash
docker compose up -d postgres
```
*Container `smart-capital-postgres` will start and expose port `5432`.*

---

### Step 2: Start Backend (FastAPI)
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows PowerShell
# source venv/bin/activate  # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Seed database with canonical ₹1.00 Cr demo portfolio
python -m app.seed.seed_database

# Launch FastAPI development server
uvicorn app.main:app --reload --port 8000
```
- **Backend API & Health:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive OpenAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 3: Start Frontend (React + Vite)
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
- **Web Application:** [http://localhost:5173](http://localhost:5173)
  - Arrives at the **Institutional Landing Page** with live interactive crash simulator.
  - Click **"Enter Risk Terminal"** or navigate directly to `http://localhost:5173/#terminal` for the full 5-tab cockpit.

---

## 6. The 3-Minute Hackathon Demo Flow

Follow this battle-tested presentation script to showcase the complete working loop to judges:

| Minute | Phase | Screen & Actions | Judge Takeaway |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:35** | **1. Baseline State** | Open **Landing Page** & click **"Enter Risk Terminal"**. Show ₹1.00 Cr portfolio in **GREEN (Safe)** mode with 27.8 score. | System is alive, stable, and suppresses unnecessary trading churn. |
| **0:35 – 1:10** | **2. Market Shock** | Navigate to **Stress Lab**. Trigger the **"Market Crash"** (-30% Equity). Score spikes to **84.6 (RED: Capital Guard)**. | Instant multi-factor breach detection across volatility and drawdown. |
| **1:10 – 1:55** | **3. Diagnosis & Optimizer** | Show **Euler Attribution** (Equity causes 91% of risk). CVXPY calculates the **minimum intervention**: Equity 45% $\to$ 20%, Cash 5% $\to$ 20%, turnover 18.5%, cost ₹3,520. | Does not panic sell; restrains churn to the smallest compliant move. |
| **1:55 – 2:35** | **4. Reverse Stress Testing** | Click **"Approve Rebalance"**. Risk score drops to **26.1 (GREEN)**. Run **Reverse Stress Testing**: Distance to Failure expands from $0.94\sigma$ to $>2.8\sigma$. | **The WOW Moment:** Mathematically proves portfolio resilience expansion. |
| **2:35 – 3:00** | **5. Audit & Governance** | Open **Decision History**. Show cryptographic audit trail in PostgreSQL and open **AEGIS Copilot** for policy citation. | Enterprise-ready regulatory governance meeting Basel III / SEBI standards. |

*See [`docs/AEGIS_DEMO_FLOW.md`](docs/AEGIS_DEMO_FLOW.md) for full word-for-word pitch narration and judge Q&A defense.*

---

## 7. Verification & Automated Test Suite

AEGIS features an institutional test suite validating core financial invariants and end-to-end integration pipelines:

```bash
cd backend
pytest tests/ -v
```

### All 117 Tests Passing:
- ✅ **Budget Conservation Invariant:** $\sum w_i = 1.0 \pm 10^{-5}$ across all solver runs.
- ✅ **Long-Only Feasibility Invariant:** $w_i \ge 0 \quad \forall i$ (No shorting violations).
- ✅ **Risk Monotonicity Invariant:** Stressed rebalances strictly reduce portfolio variance ($\sigma_{\text{after}} < \sigma_{\text{before}}$).
- ✅ **Turnover & Non-Negative Friction:** Turnover $T \ge 0$, Transaction Cost $C_{\text{txn}} \ge 0$.
- ✅ **Audit Immutability:** 100% of historical proposals and approvals persist without database mutation.

---

## 8. Documentation Index

The repository contains institutional-grade engineering documentation:

- 📘 **[AEGIS Master Specification](docs/AEGIS_FINAL_PRODUCT_SPECIFICATION.md)** — Canonical 34-section technical specification.
- 🏗️ **[Technical Architecture Blueprint](docs/AEGIS_TECHNICAL_ARCHITECTURE.md)** — Frontend, backend, optimizer, and database topology.
- 📐 **[Financial Model & Mathematical Proofs](docs/financial-model.md)** — Euler risk decomposition, QP solver formulation, and reverse stress search.
- 🎬 **[3-Minute Hackathon Demo Script](docs/AEGIS_DEMO_FLOW.md)** — Minute-by-minute pitch guide with judge defense answers.
- 💾 **[Database & Audit Schema](docs/database.md)** — PostgreSQL 11-table relational architecture and index strategy.
- 🔌 **[REST API Contracts](docs/api.md)** — Complete OpenAPI endpoint specifications and payload schemas.
- ⚖️ **[Architecture Decision Records (ADRs)](docs/AEGIS_ARCHITECTURE_DECISIONS.md)** — Formal record of architectural decisions 1–10.

---

## 9. License & Academic Disclaimer

This project is developed for hackathon evaluation and academic demonstration purposes. It does not constitute financial advice and is not configured for live retail execution.
