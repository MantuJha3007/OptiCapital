# Database Schema

## Tables (11)

| # | Table | Purpose |
|---|-------|---------|
| 1 | assets | Financial instruments (Equity, Bonds, Gold, Cash) |
| 2 | portfolios | Portfolio definition with total capital |
| 3 | holdings | Current allocation (weight + market value per asset) |
| 4 | market_prices | Historical OHLC daily prices |
| 5 | risk_snapshots | Persisted risk engine results |
| 6 | optimization_runs | Optimizer decision records |
| 7 | optimization_allocations | Per-asset old/new weights per optimization |
| 8 | scenarios | Scenario definitions (Normal, Crash, Inflation) |
| 9 | scenario_shocks | Per-asset shock percentages |
| 10 | alerts | Control engine breach events |
| 11 | rebalance_actions | Audit trail for rebalance decisions |

## Relationships

- Portfolio → Holdings → Assets
- Portfolio → Risk Snapshots
- Portfolio → Optimization Runs → Optimization Allocations
- Portfolio → Alerts
- Portfolio → Rebalance Actions → Optimization Runs
- Scenarios → Scenario Shocks → Assets
- Assets → Market Prices
