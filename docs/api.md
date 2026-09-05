# API Documentation

Base URL: `http://localhost:8000`

## GET /api/health
Health check with database connectivity.

## GET /api/portfolio
Returns current portfolio with holdings and asset details.

## GET /api/risk
Calculates current risk metrics, saves snapshot, returns score + level.

## GET /api/scenarios
Lists all scenarios with their per-asset shocks.

## POST /api/optimize
Runs CVXPY optimization with current risk-level constraints.
Body: `{ "risk_aversion": 1.0 }` (optional)

## POST /api/scenarios/run
**Most important endpoint.** Runs full scenario pipeline.
Body: `{ "scenario_id": "uuid" }`
Returns: complete before/after response with risk, control, recommendation.

## POST /api/rebalance
Approve or reject a rebalance recommendation.
Body: `{ "optimization_id": "uuid", "approved": true }`

## GET /api/rebalance/history
Returns recent rebalance actions for audit display.

## GET /api/optimization
Returns recent optimization runs.
