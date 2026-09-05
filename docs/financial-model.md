# Financial Model

## Optimisation objective

```
maximize   wᵀμ  −  λ(wᵀΣw)  −  (c + γ)·‖w − w₀‖₁
subject to sum(w) = 1
           w ≥ 0
           per-asset min/max weight
           equity ≤ max_equity          (regime dependent)
           cash   ≥ min_cash            (regime dependent)
           wᵀΣw  ≤ max_volatility² + s  (regime dependent, s ≥ 0 penalised)
```

| Symbol | Meaning | Default |
|---|---|---|
| `μ` | annualised expected returns | from market data |
| `Σ` | annualised covariance | from market data, stressed under scenarios |
| `λ` | risk aversion | `RISK_AVERSION` = 1.0 |
| `c` | transaction cost rate | `TRANSACTION_COST_RATE` = 0.001 |
| `γ` | intervention penalty | `INTERVENTION_PENALTY` = 0.15 |
| `s` | volatility slack | penalised at 50.0 |

**Every term is a fraction of portfolio value.** This matters. Transaction
cost was previously computed in currency (`turnover × value × rate`, roughly
8,500) and subtracted from an expected return expressed as a fraction
(roughly 0.07), making the cost term about five orders of magnitude larger
than everything else. The solver was effectively blind to both expected
return and `λ`.

### Why γ exists

Real transaction cost is about 0.1% of turnover — far too small to deter
churn on its own. Minimum necessary intervention therefore has to be stated
explicitly rather than hoped for. `γ` is deliberately set **above** the risk
reduction available from fully de-risking (the variance of a stressed book is
around 0.06). Below that threshold the objective keeps trading past the point
where the portfolio is already inside its limits; above it, the hard
constraints decide how far to go and the solver stops exactly there.

That is what makes the output the *smallest trade that restores safety*
rather than the lowest-risk book obtainable.

### Why the volatility limit has slack

In a severe enough regime the limit can be unreachable within the other
bounds. A bare hard constraint would make the problem infeasible, the solver
would return nothing, and the caller would fall back to the unchanged book —
the one moment a risk system must not go quiet. The penalised slack means the
solver always returns the best attainable allocation and reports how much
risk it could not remove.

---

## Risk score (0–100)

| Component | Weight | Normalisation |
|-----------|--------|---------------|
| Volatility | 30% | 0% → 0, 30%+ → 100 |
| Max drawdown | 25% | 0% → 0, 20%+ → 100 |
| Concentration (HHI) | 20% | 0.20 → 0, 1.00 → 100 |
| Illiquidity | 15% | ratio 1.00 → 0, 0.00 → 100 |
| Market stress | 10% | 0 → 0, 1 → 100 |

Bands: **SAFE** 0–30 · **WARNING** 30–60 · **STRESS** 60–80 · **CRISIS** 80–100

---

## Stress repricing — how a scenario changes risk

A scenario shock does **not** only reprice weights. Modelling it that way
inverts the result: after a crash the asset that fell occupies a smaller
share of the book, so naive recomputation against the calm historical
covariance reports *lower* portfolio volatility after a market collapse. The
control engine could then never escalate.

A shock is a regime change, so two things are repriced in proportion to
severity:

**1. Volatility expands.**

```
σ'ᵢ = σᵢ · (1 + 2.0 · severity)
```

**2. Correlations converge toward 1.**

```
C' = (1 − λ_c)·C + λ_c·J        λ_c = 0.80 · severity
```

`J` is the all-ones matrix, so `C'` is a convex combination of two positive
semi-definite matrices and stays a valid covariance — which the optimiser
requires. This is diversification failing exactly when it is needed, and it
is why a shock can raise portfolio risk even as the falling asset's weight
shrinks.

**Severity** is drawn from the scenario itself:

```
severity = clamp( 0.6·(worst_asset_shock / 0.35) + 0.4·(portfolio_loss / 0.25), 0, 1 )
```

Both terms matter: a −35% shock to a small sleeve is a different event from a
−35% shock to the whole book.

**Drawdown and market stress** are also overridden. The shock's realised loss
is itself a peak-to-trough decline, and recomputing drawdown from unshocked
price history would silently discard it.

---

## Dynamic constraints

| Parameter | SAFE | WARNING | STRESS | CRISIS |
|-----------|------|---------|--------|--------|
| Max equity | 50% | 45% | 35% | 20% |
| Min cash | 10% | 12% | 15% | 20% |
| Max volatility | 15% | 14% | 12% | 10% |
| Max drawdown | 10% | 10% | 8% | 5% |

### Breach triggers vs optimiser bounds

These are different things and the distinction is deliberate:

- **Breach triggers** — volatility, drawdown, liquidity, concentration and
  market stress, tested against the SAFE thresholds. A breach is what causes
  an intervention.
- **Optimiser bounds** — `max_equity` and `min_cash`. These shape the
  solution when a reallocation is solved. An allocation sitting outside one
  does not by itself trigger an intervention.

---

## Transaction cost

```
cost = Σ|w_new − w_old| × portfolio_value × 0.001
```

Measured against the **post-shock** book, since that is the position the
recommendation actually trades from. The API returns those weights as
`shock.weights_after` so the client never has to re-derive them.

---

## Demo portfolio

| Asset | Weight |
|---|---|
| Equity | 37% |
| Government Bonds | 27% |
| Corporate Bonds | 15% |
| Gold | 10% |
| Cash | 11% |

HHI 0.254, drawdown 8.4%, risk score 22.8 — **SAFE, with no breaches.**

The book has to start comfortably inside its own envelope, because the
product's central claim is that the correct action is usually no action. An
earlier 45/25/15/10/5 split sat exactly on two SAFE limits (HHI 0.300 against
a 0.300 ceiling, 5% cash against a 10% floor), so the engine reported
breaches at rest and even a benign scenario produced a rebalance.

## Scenario outcomes

| Scenario | Loss | Risk score | Regime | Breaches | Action | Turnover |
|---|---|---|---|---|---|---|
| Normal Market | +1.3% | 22.8 → 23.0 | SAFE | 0 | **HOLD** | 0.0% |
| Inflation Shock | −7.4% | 22.8 → 38.3 | WARNING | 2 | REBALANCE | 23.7% |
| Market Crash | −16.2% | 22.8 → 62.3 | STRESS | 3 | REBALANCE | 72.0% |
| Systemic Crisis | −24.0% | 22.8 → 67.3 | STRESS | 3 | REBALANCE | 73.0% |

Turnover under the severe scenarios is large because it is the *minimum*
required: taking a book from 30% volatility to a 12% STRESS limit, when
correlations have converged, cannot be done with a small trade. The system
states the size of that trade and its cost rather than hiding it.
