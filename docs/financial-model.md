# Financial Model

## Optimization Objective

maximize: wᵀμ − λ(wᵀΣw) − transaction_cost

Where:
- w = weight vector
- μ = expected return vector
- Σ = covariance matrix
- λ = risk aversion parameter
- transaction_cost = Σ|w_new - w_old| × portfolio_value × 0.001

## Risk Score (0–100)

| Component | Weight | Normalisation |
|-----------|--------|---------------|
| Volatility | 30% | 0% → 0, 30%+ → 100 |
| Max Drawdown | 25% | 0% → 0, 20%+ → 100 |
| Concentration (HHI) | 20% | 0.2 → 0, 1.0 → 100 |
| Liquidity | 15% | 1.0 → 0, 0.0 → 100 |
| Market Stress | 10% | 0 → 0, 1 → 100 |

## Dynamic Constraints

| Parameter | SAFE | WARNING | STRESS | CRISIS |
|-----------|------|---------|--------|--------|
| Max Equity | 50% | 45% | 35% | 20% |
| Min Cash | 10% | 12% | 15% | 20% |
| Max Volatility | 15% | 14% | 12% | 10% |
| Max Drawdown | 10% | 10% | 8% | 5% |

## Transaction Cost

Rate: 0.1%
Formula: Σ|w_new − w_old| × portfolio_value × 0.001
