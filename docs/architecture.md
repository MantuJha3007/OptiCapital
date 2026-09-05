# Architecture

## System overview

Layered service architecture:

- **API routes** handle HTTP concerns only
- **Services** contain business logic
- **Financial engines** perform calculations (NumPy / CVXPY)
- **SQLAlchemy** manages database access
- **PostgreSQL or SQLite** persists all state

```
API route → Service → Financial engine → Repository → Database
```

## The control loop

```
Market & portfolio data
        ↓
Risk engine            6 metrics → 0-100 score
        ↓
Control engine         score → regime → dynamic constraints + breach detection
        ↓
Optimiser (CVXPY)      minimum intervention restoring the envelope
        ↓
Rebalancer             HOLD / REBALANCE / CRISIS_PROTECTION
        ↓
Audit trail            every assessment and decision persisted
```

## Key components

### Risk engine
Six metrics into a weighted 0–100 score: volatility (30%), max drawdown
(25%), concentration (20%), illiquidity (15%), market stress (10%).

Accepts `cov_matrix`, `mean_returns`, `drawdown_override` and
`stress_override` so a caller can evaluate the portfolio in a regime the
stored price history does not contain.

### Control engine
Maps the score to SAFE / WARNING / STRESS / CRISIS, selects the constraint
set for that regime, and detects breaches against the SAFE thresholds.

Breach triggers (volatility, drawdown, liquidity, concentration, stress) are
distinct from optimiser bounds (max equity, min cash). Only the former cause
an intervention.

### Scenario engine — stress repricing
The step that makes stress testing meaningful. A shock is treated as a regime
change, not just a repricing of weights:

- volatilities expand with severity
- correlations converge toward 1
- the shock's realised loss is carried through as a drawdown

Without this the pipeline is not merely imprecise, it is **inverted**: after a
crash the fallen asset occupies a smaller share of the book, so risk measured
against the calm historical covariance goes *down*, and the control engine
never escalates.

### Optimiser
CVXPY over a fully dimensionless objective — expected return, variance and a
turnover penalty are all fractions of portfolio value. The volatility limit
carries penalised slack so the problem is always feasible and the engine
never goes silent at the moment it matters most.

### Rebalancer
Decides the action and persists it. On HOLD the recommendation is the current
book: a verdict of "no intervention required" must not arrive with a trade
list attached.

## Data flow for a scenario run

1. Load portfolio, capture pre-shock risk
2. Apply per-asset shocks, renormalise weights
3. Compute severity, stress the covariance
4. Recompute risk in the stressed regime
5. Control engine: regime, constraints, breaches
6. Optimise against the stressed covariance
7. Determine action; on HOLD, recommend no change
8. Persist optimisation run, allocations and the decision
9. Return the complete before/after response
