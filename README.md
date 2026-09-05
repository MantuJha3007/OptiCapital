# Smart Capital Guard

**Financial Capital Management & Risk-Control MVP**

A hackathon-ready simulation/decision-support system demonstrating:

> Market Data → Portfolio → Risk Engine → Dynamic Control Engine → CVXPY Optimization → Transaction Cost → Rebalance Recommendation → PostgreSQL Audit Storage → Interactive Dashboard

⚠️ **This system is a simulation. It does NOT execute real financial trades.**

---

## Architecture

```
                         React + TypeScript
                               │
                               │ REST API
                               ▼
                         ┌─────────────┐
                         │   FastAPI   │
                         └──────┬──────┘
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
       Portfolio Service   Risk Engine        Scenario Engine
             │                  │                  │
             └──────────────────┼──────────────────┘
                                ▼
                         Control Engine
                                │
                                ▼
                           Optimizer
                           CVXPY
                                │
                                ▼
                         Rebalance Engine
                                │
                                ▼
                         PostgreSQL
```

## Tech Stack

| Layer          | Technology                               |
|----------------|------------------------------------------|
| **Backend**    | Python 3.11+, FastAPI, SQLAlchemy 2.x    |
| **Database**   | PostgreSQL 16                            |
| **Optimizer**  | CVXPY (Mean-Variance)                    |
| **Frontend**   | React, TypeScript, Vite, Tailwind, Recharts |
| **Infra**      | Docker Compose                           |

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

### 3. Seed Database

```bash
cd backend
python -m app.seed.seed_database
```

### 4. Start Backend

```bash
cd backend
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000  
API docs at: http://localhost:8000/docs

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

## Demo Flow

1. Open the dashboard
2. View portfolio metrics and risk score
3. Select **Market Crash** scenario
4. Click **RUN SIMULATION**
5. Observe: risk increases → CRISIS mode → constraints tighten
6. Review recommended allocation and transaction cost
7. Click **APPROVE REBALANCE**
8. Observe: holdings updated, risk reduced

## API Endpoints

| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| GET    | `/api/health`        | Health check                   |
| GET    | `/api/portfolio`     | Current portfolio & holdings   |
| GET    | `/api/risk`          | Calculate risk metrics         |
| GET    | `/api/scenarios`     | List available scenarios       |
| POST   | `/api/optimize`      | Run portfolio optimization     |
| POST   | `/api/scenarios/run` | Run scenario simulation        |
| POST   | `/api/rebalance`     | Approve/reject rebalance       |

## Testing

```bash
cd backend
pytest tests/ -v
```

## Database

11 PostgreSQL tables with full audit trail:

`assets` · `portfolios` · `holdings` · `market_prices` · `risk_snapshots` · `optimization_runs` · `optimization_allocations` · `scenarios` · `scenario_shocks` · `alerts` · `rebalance_actions`

> "Every risk assessment, optimization decision, alert, and rebalance approval is persisted as an auditable event in PostgreSQL."
