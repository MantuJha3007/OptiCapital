# API Reference

Base URL: `http://localhost:8000`. Interactive docs at `/docs`.

## GET /api/health
Health check with database connectivity.

## GET /api/portfolio
Current portfolio with holdings and nested asset details.

## GET /api/risk
Calculates current risk metrics, persists a snapshot, returns score and level.

## GET /api/scenarios
All scenarios with their per-asset shock percentages.

## POST /api/optimize
Runs the optimiser at the current regime.
Body: `{ "risk_aversion": 1.0 }` (optional)

## POST /api/scenarios/run
**The core endpoint.** Runs the full pipeline: shock → stress repricing →
risk → control → optimise → cost → recommendation → persist.

Body: `{ "scenario_id": "<uuid>" }`

Response:

| Field | Meaning |
|---|---|
| `before` | pre-shock value, score, level, volatility, drawdown, liquidity |
| `shock.details` | applied shock per asset symbol |
| `shock.portfolio_loss` | realised loss as a fraction |
| `shock.portfolio_value_after` | post-shock portfolio value |
| `shock.weights_after` | **renormalised post-shock weights** |
| `after_shock` | score, level and metrics in the stressed regime |
| `control.mode` | regime engaged |
| `control.breaches` | human-readable breach descriptions |
| `control.constraints` | constraint set now in force |
| `recommendation.action` | `HOLD`, `REBALANCE` or `CRISIS_PROTECTION` |
| `recommendation.allocation` | target weights by lowercase symbol |
| `recommendation.turnover` | total absolute weight moved |
| `recommendation.transaction_cost` | cost in rupees |
| `recommendation.explanation` | generated reasoning |

`shock.weights_after` is the baseline the recommendation trades from.
Turnover, transaction cost and the explanation are all measured against it,
**not** against the pre-shock book — a client comparing the proposed
allocation to pre-shock weights will disagree with the engine's own numbers.

On `HOLD` the allocation equals `shock.weights_after`, with zero turnover and
zero cost.

## POST /api/rebalance
Approve or reject a recommendation. Approval updates simulated holdings.
Body: `{ "optimization_id": "<uuid>", "approved": true }`

## GET /api/rebalance/history
Recent decisions with action, approval, cost, risk before/after and reasoning.

## GET /api/optimization
Recent optimiser runs with before/after return and volatility.
