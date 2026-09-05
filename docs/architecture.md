# Architecture

## System Overview

Smart Capital Guard follows a layered service architecture where:
- **API Routes** handle HTTP concerns only
- **Services** contain business logic
- **Financial Engines** perform calculations (Python/NumPy/CVXPY)
- **SQLAlchemy** manages database access
- **PostgreSQL** persists all state

## Request Flow

```
API Route → Service → Financial Engine → Repository → PostgreSQL
```

## Key Components

### Risk Engine
Calculates 6 metrics and produces a 0-100 risk score:
- 30% Volatility
- 25% Maximum Drawdown
- 20% Concentration (HHI)
- 15% Liquidity
- 10% Market Stress

### Control Engine
Maps risk score to one of four modes (SAFE / WARNING / STRESS / CRISIS) and dynamically adjusts constraints for the optimizer.

### CVXPY Optimizer
Solves: maximize wᵀμ - λ(wᵀΣw) - transaction_cost
Subject to dynamic constraints from the control engine.

### Scenario Engine
Full pipeline: Load → Shock → Risk → Control → Optimize → Cost → Recommend → Persist

### Rebalancer
Determines HOLD / REBALANCE / CRISIS_PROTECTION. Approval updates simulated holdings.
