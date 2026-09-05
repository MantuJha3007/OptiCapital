# OptiCapital — Smart Capital Guard

**Adaptive capital management, risk control and dynamic rebalancing.**

> Market data → Portfolio → Risk engine → Control engine → CVXPY optimiser →
> Transaction cost → Recommendation → Audited decision → Dashboard

The system does not continuously chase an optimal portfolio. It maintains a
**safe operating envelope**, and when the book leaves it, applies the
**minimum intervention** that restores safety.

⚠️ **Simulation and decision support. It does not execute real trades.**

---

## Quick start

Two ways to run it. Both give the identical schema, engine and audit trail.

### Option A — SQLite, no infrastructure (fastest)

```bash
cd backend
pip install -r requirements.txt

# Windows PowerShell:  $env:DATABASE_URL="sqlite:///./opticapital.db"
# macOS/Linux:
export DATABASE_URL="sqlite:///./opticapital.db"

python -m app.seed.seed_database
uvicorn app.main:app --reload
```

### Option B — PostgreSQL

```bash
docker compose up -d          # Postgres 16 on host port 5433

cd backend
pip install -r requirements.txt
python -m app.seed.seed_database
uvicorn app.main:app --reload
```

> The container maps host port **5433**, not 5432. A machine with PostgreSQL
> already installed is listening on 5432, and Windows lets the container bind
> the same port without complaint — connections then reach the pre-existing
> server and fail with a confusing `role "capital_user" does not exist`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Re-running the demo

Approving a crisis rebalance rewrites the holdings, so the book stays
defensive afterwards. To restore the starting state:

```bash
cd backend
python -m app.seed.seed_database --reset
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

Vite proxies `/api` to port 8000, so no CORS configuration is needed in
development.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.x |
| Database | PostgreSQL 16 (SQLite supported) |
| Optimiser | CVXPY (SCS) |
| Frontend | React 19, TypeScript, Vite, Tailwind v4 |
| Visualisation | d3-force, Recharts |
| Infra | Docker Compose |

---

## The five views

| # | View | Question it answers |
|---|---|---|
| 01 | Overview | Is the portfolio operating safely? |
| 02 | Risk Attribution | Where is the risk coming from? |
| 03 | Contagion | What is connected to what? |
| 04 | Stress Studio | What breaks us, and what then? |
| 05 | Execution Ledger | What did we decide, and why? |

They are one control loop, not five pages: the live regime and any
outstanding decision travel with you across all of them, and the interface
takes its accent colour from the live risk regime, so colour always means
risk.

---

## Demo flow

1. Open the dashboard — **SAFE**, risk 22.8, no breaches, *no intervention required*.
2. Stress Studio → **Normal Market** → run. Verdict is **HOLD**, turnover **0.0%**.
   The system declining to act is the point.
3. Stress Studio → **Market Crash** → run. Risk **22.8 → 62.3**, regime escalates
   to **STRESS**, three limits breached, constraints tighten automatically.
4. Read the recommendation: 3 of 5 positions move, cost stated in rupees.
5. **Approve** → holdings update, decision is written to the audit trail.
6. Execution Ledger → the decision, with its full reasoning chain.
7. Contagion → why the book was more fragile than its allocation chart suggested.

---

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health and database connectivity |
| GET | `/api/portfolio` | Portfolio with holdings |
| GET | `/api/risk` | Risk metrics, persists a snapshot |
| GET | `/api/scenarios` | Scenarios with per-asset shocks |
| POST | `/api/optimize` | Optimise at the current regime |
| POST | `/api/scenarios/run` | Full scenario pipeline |
| POST | `/api/rebalance` | Approve or reject a recommendation |
| GET | `/api/rebalance/history` | Decision audit trail |
| GET | `/api/optimization` | Recent optimiser runs |

Details in [docs/api.md](docs/api.md).

---

## Testing

```bash
cd backend
pytest -q                # 78 tests, no database setup required
```

```bash
cd frontend
npx tsc --noEmit && npm run build
```

The suite runs against a throwaway SQLite file created by the fixtures, so it
needs neither Docker nor PostgreSQL.

`tests/test_pipeline.py` covers the assembled control loop rather than
formulas in isolation, and asserts the directional properties the product
promises — a crash must *raise* risk, a benign scenario must trade nothing,
an intervention must reduce risk. These exist because a serious defect once
survived a fully passing unit suite: every formula was individually correct
while the pipeline reported a *calmer* portfolio after a market crash.

---

## Documentation

| Document | Contents |
|---|---|
| [docs/architecture.md](docs/architecture.md) | System layers and request flow |
| [docs/financial-model.md](docs/financial-model.md) | Objective, risk score, stress repricing, constraints |
| [docs/api.md](docs/api.md) | Endpoint reference |
| [docs/database.md](docs/database.md) | Schema and relationships |
| [docs/demo-script.md](docs/demo-script.md) | Presentation walkthrough |

---

## Audit trail

11 tables. Every risk assessment, optimiser run, alert, recommendation and
approval is persisted as an auditable event:

`assets` · `portfolios` · `holdings` · `market_prices` · `risk_snapshots` ·
`optimization_runs` · `optimization_allocations` · `scenarios` ·
`scenario_shocks` · `alerts` · `rebalance_actions`

Holds are recorded with the same weight as interventions. A system that only
logs the times it acted cannot show that it declined to act — and restraint
is the behaviour this product argues for.
