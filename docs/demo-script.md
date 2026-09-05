# Demo Script

## Setup (before demo)
1. `docker compose up -d`
2. `cd backend && python -m app.seed.seed_database`
3. `cd backend && uvicorn app.main:app --reload`
4. `cd frontend && npm run dev`

## Live Demo Flow

### 1. Show Healthy Portfolio (30 seconds)
- Open dashboard at http://localhost:5173
- Point out: ₹1 Crore capital, SAFE risk level, allocation pie chart
- "Our system monitors this portfolio in real-time"

### 2. Run Market Crash (1 minute)
- Select "Market Crash" scenario
- Click "RUN SIMULATION"
- Point out: risk jumps to CRISIS, volatility spikes, breaches appear
- "The system automatically detects multiple threshold breaches"

### 3. Show Smart Response (1 minute)
- Point out: dynamic constraints tightened (equity max → 20%, cash min → 20%)
- Show recommended allocation vs current
- Show transaction cost
- "Our CVXPY optimizer found the optimal reallocation within crisis constraints"

### 4. Approve Rebalance (30 seconds)
- Click "APPROVE REBALANCE"
- Show updated holdings
- "Every decision is stored as an auditable event in PostgreSQL"

### 5. Key Pitch Points
- "Every risk assessment, optimization, and rebalance is persisted in PostgreSQL"
- "The system explains WHY it makes each recommendation"
- "Dynamic constraints adapt in real-time based on market conditions"
- "This would work in a real financial institution — full audit trail"
