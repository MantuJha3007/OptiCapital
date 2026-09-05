# Smart Capital Guard (Engineering Foundation for AEGIS)
## Final Product Specification, Architecture & Implementation Plan

> [!NOTE]
> **CANONICAL PRODUCT SYNTHESIS:**
> This comprehensive document represents the detailed engineering and architectural blueprint authored by the team lead. 
> The final hackathon product direction has been formally unified as:
> **AEGIS — Adaptive Capital Resilience & Risk-Control System**
> 
> The canonical documentation suite incorporating this plan and the final AEGIS pitch is located in `docs/`:
> - [AEGIS_FINAL_PRODUCT_SPECIFICATION.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_FINAL_PRODUCT_SPECIFICATION.md) (Master Specification)
> - [AEGIS_TECHNICAL_ARCHITECTURE.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_TECHNICAL_ARCHITECTURE.md) (Technical Architecture)
> - [AEGIS_MODULE_MAP.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_MODULE_MAP.md) (Concrete Code Mapping)
> - [AEGIS_IMPLEMENTATION_ROADMAP.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_IMPLEMENTATION_ROADMAP.md) (Milestones & Priorities)
> - [AEGIS_IMPLEMENTATION_STATUS.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_IMPLEMENTATION_STATUS.md) (Reality-Checked Status)
> - [AEGIS_ARCHITECTURE_DECISIONS.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_ARCHITECTURE_DECISIONS.md) (Architecture Decisions)
> - [AEGIS_DEMO_FLOW.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_DEMO_FLOW.md) (Judging Demo Script)
> 
> This document remains preserved in its entirety as a core technical foundation.

**Version:** 1.0  
**Status:** Preserved Engineering Specification (Foundation for AEGIS)  
**Product Type:** Financial capital-management and risk-control simulation / decision-support system  
**Execution:** Simulation only — no real financial trades

---

# 1. Final Product — What Are We Building?

## One-line definition

> **Smart Capital Guard is a closed-loop financial risk-control system that monitors a portfolio, detects when risk moves outside a safe operating range, diagnoses the cause, uses constrained optimization to find the least-disruptive feasible rebalance, independently validates it, calculates its transaction cost, stress-tests the result, and records the complete decision in an audit trail.**

The product is designed for a **risk manager**.

The risk manager should be able to open the application and answer:

1. **What is the current portfolio?**
2. **How risky is it?**
3. **Are we safe?**
4. **What caused the risk?**
5. **Do we need to intervene?**
6. **If we intervene, what should we change?**
7. **How much will that intervention cost?**
8. **Does the proposed portfolio actually satisfy the limits?**
9. **What happens under a market shock?**
10. **How close are we to a failure condition?**
11. **Why did the system recommend this action?**
12. **Can we see exactly what decision was made and when?**

The system is therefore **not just a portfolio dashboard** and **not just a portfolio optimizer**.

It is:

```text
OBSERVE
   ↓
MEASURE
   ↓
DETECT
   ↓
DIAGNOSE
   ↓
DECIDE
   ↓
OPTIMIZE
   ↓
VALIDATE
   ↓
STRESS TEST
   ↓
EXPLAIN
   ↓
AUDIT
   ↓
REASSESS
```

---

# 2. What We Keep From the Leader's Original Idea

The leader's original architecture is the foundation and should remain the primary implementation.

```text
Market Data
     ↓
Portfolio
     ↓
Risk Engine
     ↓
Dynamic Control Engine
     ↓
CVXPY Optimization
     ↓
Transaction Cost
     ↓
Rebalance Recommendation
     ↓
PostgreSQL Audit Storage
     ↓
Interactive Dashboard
```

We are **not replacing this architecture**.

We are strengthening it with a small number of high-value capabilities:

```text
Original Smart Capital Guard
        +
Safe Operating Envelope
        +
Risk Attribution
        +
Stress Testing
        +
Reverse Stress Testing
        +
Minimum-Intervention Objective
        +
Independent Validation
        +
Explainable Decision Record
```

This keeps the project realistic for a 24/25-hour hackathon while giving it a much stronger story.

---

# 3. Final Product Architecture

```text
                         ┌──────────────────────────────┐
                         │     React + TypeScript        │
                         │                              │
                         │ Dashboard                    │
                         │ Portfolio                    │
                         │ Risk                         │
                         │ Optimization                 │
                         │ Stress Lab                   │
                         │ Decision History             │
                         └──────────────┬───────────────┘
                                        │
                                  REST API / JSON
                                        │
                                        ▼
                              ┌───────────────────┐
                              │      FastAPI      │
                              └─────────┬─────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
             ▼                          ▼                          ▼
    ┌────────────────┐        ┌────────────────┐        ┌────────────────┐
    │ Portfolio       │        │ Risk Engine    │        │ Scenario       │
    │ Service         │        │                │        │ Engine         │
    └────────┬───────┘        └────────┬───────┘        └────────┬───────┘
             │                         │                          │
             │                         │                 ┌────────┴────────┐
             │                         │                 │                 │
             │                         │                 ▼                 ▼
             │                         │             Forward          Reverse
             │                         │             Stress            Stress
             │                         │
             └─────────────────────────┼──────────────────────────────┐
                                       ▼                              │
                             ┌───────────────────┐                    │
                             │  Control Engine   │◄───────────────────┘
                             │                   │
                             │ Safe Envelope     │
                             │ Risk State        │
                             │ Thresholds        │
                             │ Hysteresis        │
                             └─────────┬─────────┘
                                       │
                                       ▼
                             ┌───────────────────┐
                             │ CVXPY Optimizer   │
                             │                   │
                             │ Min Intervention  │
                             │ Risk Constraints  │
                             │ Turnover          │
                             │ Transaction Cost   │
                             └─────────┬─────────┘
                                       │
                                       ▼
                             ┌───────────────────┐
                             │ Validator         │
                             │                   │
                             │ Independent       │
                             │ Hard Constraints  │
                             │ PASS / FAIL       │
                             └─────────┬─────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
                ┌────────────────┐          ┌────────────────┐
                │ Rebalance      │          │ Explanation    │
                │ Recommendation  │          │ / AI Layer     │
                └────────┬───────┘          └────────┬───────┘
                         │                           │
                         └─────────────┬─────────────┘
                                       ▼
                              ┌───────────────────┐
                              │   PostgreSQL      │
                              │                   │
                              │ Risk Snapshots    │
                              │ Optimization      │
                              │ Scenarios         │
                              │ Alerts            │
                              │ Rebalances        │
                              │ Audit History     │
                              └───────────────────┘
```

---

# 4. Product Modules

The final system consists of these modules:

| Module | Responsibility |
|---|---|
| Portfolio Service | Portfolio and holdings |
| Market Data Service | Historical/current simulation data |
| Risk Engine | Quantitative risk calculations |
| Risk Attribution | Explains risk drivers |
| Control Engine | Determines whether intervention is needed |
| Safe Operating Envelope | Defines safe/warning/crisis zones |
| Optimizer | Finds constrained target allocation |
| Transaction Cost Engine | Estimates intervention cost |
| Validator | Independently checks recommendation |
| Scenario Engine | Applies market shocks |
| Reverse Stress Engine | Searches for failure boundary |
| Decision/Audit Service | Stores every important decision |
| AI Explanation Layer | Converts structured results into natural language |
| Dashboard | Interactive risk-manager interface |

---

# 5. Data Model

The database should contain the following core tables.

```text
assets
portfolios
holdings
market_prices
risk_snapshots
optimization_runs
optimization_allocations
scenarios
scenario_shocks
alerts
rebalance_actions
```

## 5.1 assets

```text
id
symbol
name
asset_class
sector
issuer
liquidity_score
transaction_cost_bps
created_at
```

Example assets:

```text
EQUITY_ETF
GOV_BOND
CORP_BOND
GOLD
CASH
```

---

## 5.2 portfolios

```text
id
name
base_currency
initial_capital
created_at
updated_at
```

---

## 5.3 holdings

```text
id
portfolio_id
asset_id
quantity
market_value
weight
updated_at
```

---

## 5.4 market_prices

```text
id
asset_id
timestamp
price
return
```

For the hackathon, deterministic seeded historical data is acceptable.

---

## 5.5 risk_snapshots

```text
id
portfolio_id
timestamp

expected_return
volatility
var
cvar
max_drawdown
liquidity_ratio
concentration
risk_score

control_state
regime_state
```

---

## 5.6 optimization_runs

```text
id
portfolio_id
timestamp

objective_value
turnover
transaction_cost

status
solver_status
```

---

## 5.7 optimization_allocations

```text
id
optimization_run_id
asset_id

old_weight
new_weight
weight_change
```

---

## 5.8 scenarios

```text
id
name
description
created_at
```

---

## 5.9 scenario_shocks

```text
id
scenario_id
asset_id

return_shock
price_shock
volatility_shock
rate_shock
credit_spread_shock
```

Only fields required by the scenario need to be populated.

---

## 5.10 alerts

```text
id
portfolio_id
timestamp

severity
metric
threshold
actual_value
message
resolved
```

---

## 5.11 rebalance_actions

```text
id
portfolio_id
optimization_run_id

created_at
status

turnover
transaction_cost

approved_at
rejected_at

reason
```

---

# 6. Risk Configuration

Keep all risk limits configurable.

Example:

```yaml
cvar_limit: 0.08

volatility_limit: 0.20

liquidity_min: 1.10

max_single_asset: 0.30

max_equity: 0.60

max_corporate_bond: 0.30

cash_min: 0.05

max_turnover: 0.15

max_drawdown: 0.15
```

These are **simulation parameters**, not regulatory limits.

Do not hard-code these values into the optimizer.

---

# 7. Safe Operating Envelope

This is the central control concept added to the original MVP.

The portfolio has four operating states:

```text
GREEN
YELLOW
ORANGE
RED
```

## GREEN — Safe

All important metrics are within acceptable limits.

```text
Action:
MONITOR

No optimization required.
```

## YELLOW — Caution

Portfolio is approaching one or more thresholds.

```text
Action:
MONITOR + PREPARE
```

The system should show which metric is approaching its limit.

## ORANGE — Warning

Risk is deteriorating materially.

```text
Action:
PREPARE OPTIMIZATION
```

## RED — Crisis

A hard risk constraint has been breached.

```text
Action:
OPTIMIZE
→ VALIDATE
→ RECOMMEND
```

---

# 8. Hysteresis

The control engine should not continuously switch between states when a metric moves around a threshold.

Example:

```text
CVaR limit = 8.0 Cr

Enter RED:
CVaR > 8.0 Cr

Recover from RED:
CVaR < 7.5 Cr
```

This prevents:

```text
RED → GREEN → RED → GREEN
```

from small fluctuations.

Implementation:

```python
if state != "RED" and cvar > crisis_threshold:
    state = "RED"

elif state == "RED" and cvar < recovery_threshold:
    state = "ORANGE"
```

The exact implementation can be generalized for all risk states.

---

# 9. Risk Engine

The Risk Engine is the quantitative source of truth.

It should calculate:

```text
Expected Return
Volatility
VaR
CVaR
Maximum Drawdown
Liquidity
Concentration
Risk Contribution
Risk Score
Risk Budget Utilization
```

---

# 10. Portfolio Return

Given:

```text
w_i = asset weight
r_i = asset return
```

calculate:

```text
R_p = Σ(w_i × r_i)
```

---

# 11. Portfolio Volatility

Using covariance matrix `Σ`:

```text
σ_p = sqrt(wᵀ Σ w)
```

Python implementation:

```python
portfolio_variance = weights.T @ covariance @ weights
portfolio_volatility = np.sqrt(portfolio_variance)
```

---

# 12. Historical VaR

For the MVP:

1. Calculate historical asset returns.
2. Apply current portfolio weights.
3. Generate historical portfolio returns.
4. Convert returns into losses.
5. Sort losses.
6. Select the chosen confidence percentile.

Example:

```text
95% VaR
=
5th percentile of portfolio returns converted to loss
```

---

# 13. CVaR / Expected Shortfall

CVaR measures the average loss beyond the VaR threshold.

Conceptually:

```text
CVaR = mean(losses worse than VaR)
```

This should be one of the primary hard constraints because it directly captures tail loss.

---

# 14. Maximum Drawdown

Track the portfolio value through time:

```text
Peak Value
    ↓
Current Value
    ↓
Drawdown
```

Formula:

```text
Drawdown = (Current Value - Peak Value) / Peak Value
```

Maximum drawdown is the minimum historical drawdown.

---

# 15. Liquidity Ratio

For the MVP, use a simple configurable proxy.

Example:

```text
Liquidity Ratio =
liquid assets / stressed required liquidity
```

The exact formula must be documented in the code and displayed as a simulation metric.

The system should distinguish this simplified metric from institutional liquidity-risk frameworks.

---

# 16. Concentration

Calculate:

### Single-position concentration

```text
max(w_i)
```

### HHI-style concentration

```text
HHI = Σ(w_i²)
```

This gives a second view of concentration.

---

# 17. Risk Contribution

Use covariance-based marginal contribution.

Conceptually:

```text
MRC_i = ∂Risk / ∂w_i
```

Then:

```text
Risk Contribution_i
=
w_i × MRC_i
```

Display the result as:

```text
Equity              41%
Corporate Credit    32%
Government Bonds    12%
Gold                 7%
Cash                 8%
```

This answers:

> "Where is the portfolio's risk actually coming from?"

---

# 18. Risk Score

Create a dashboard-level score from normalized components.

Example:

```text
Risk Score =
30% × CVaR utilization
20% × volatility utilization
15% × concentration utilization
15% × liquidity stress
10% × drawdown utilization
10% × scenario/regime stress
```

The score is a communication layer.

**Hard constraints always take priority over the composite score.**

---

# 19. Risk Budget

Instead of showing only raw metrics, show utilization.

Example:

```text
CVaR Budget

████████░░ 80%

Liquidity

██████░░░░ 60%

Concentration

███████░░░ 70%
```

This makes the system preventive rather than purely reactive.

---

# 20. Risk Attribution

The Risk Engine should expose the biggest contributors to the current risk.

Example response:

```json
{
  "top_risk_drivers": [
    {
      "asset": "CORP_BOND",
      "contribution": 0.32
    },
    {
      "asset": "EQUITY_ETF",
      "contribution": 0.41
    }
  ]
}
```

Frontend:

```text
TOP RISK DRIVERS

1. Equity       41%
2. Credit       32%
3. Concentration 17%
4. Liquidity    10%
```

---

# 21. Scenario Engine

The existing Scenario Engine becomes the basis for the stress-testing system.

Scenarios:

```text
Normal
Market Crash
Interest Rate Shock
Credit Crisis
Combined Crisis
```

Each scenario contains explicit shocks.

Example:

```yaml
name: Market Crash

shocks:
  EQUITY_ETF: -0.20
  CORP_BOND: -0.08
  GOV_BOND: 0.02
  GOLD: 0.05
```

---

# 22. Stress Test Flow

```text
User selects scenario
        ↓
Scenario Engine
        ↓
Apply shocks
        ↓
Revalue portfolio
        ↓
Risk Engine
        ↓
Calculate stressed metrics
        ↓
Control Engine
        ↓
If breach:
        ↓
CVXPY Optimizer
        ↓
Validator
        ↓
Recalculate stressed portfolio
        ↓
Before vs After
```

---

# 23. Dynamic Control During Stress

The key demonstration should be:

```text
NORMAL
  ↓
Market Shock
  ↓
Risk increases
  ↓
Control state changes
  ↓
Constraints tighten
  ↓
Optimizer activates
  ↓
Recommendation generated
  ↓
Validator checks it
```

Example:

```text
Normal Equity Limit = 60%

Crisis Equity Limit = 35%
```

This shows why the Control Engine exists.

---

# 24. CVXPY Optimizer

The optimizer should solve:

> **Find a feasible target portfolio that improves risk while minimizing unnecessary movement and transaction cost.**

This is preferable to simply maximizing expected return.

## Optimization objective

A practical objective is:

```text
Minimize:

risk_penalty
+
λ_turnover × turnover
+
λ_cost × transaction_cost
+
λ_deviation × deviation_from_current_weights
-
λ_return × expected_return
```

For the hackathon, start with a simple version.

---

# 25. Minimum-Intervention Principle

The most important optimization behaviour is:

> **Change as little as necessary to restore safety.**

Example:

Current:

```text
Equity       35%
Gov Bonds    25%
Corp Bonds   25%
Gold          5%
Cash         10%
```

Target:

```text
Equity       28%
Gov Bonds    30%
Corp Bonds   22%
Gold          5%
Cash         15%
```

Changes:

```text
Equity       -7%
Gov Bonds    +5%
Corp Bonds   -3%
Gold          0%
Cash         +5%
```

The optimizer should not completely redesign the portfolio merely because another portfolio has slightly better theoretical expected performance.

---

# 26. CVXPY Constraint Set

Minimum constraints:

```text
Σ w_i = 1

w_i ≥ 0

w_i ≤ asset_max

equity_weight ≤ max_equity

corporate_weight ≤ max_corporate

cash_weight ≥ cash_min

turnover ≤ max_turnover

risk ≤ risk_limit
```

If using CVaR optimization directly, formulate the CVaR problem using auxiliary variables.

For a historical scenario set, a standard convex CVaR formulation can use:

```text
minimize:
α + 1/((1-β)N) Σ z_s

subject to:
z_s ≥ loss_s(w) - α
z_s ≥ 0
```

where:

```text
β = confidence level
N = number of scenarios
```

This allows CVaR to be incorporated directly into the optimization rather than only checked afterward.

---

# 27. Transaction Cost Engine

Every proposed rebalance must calculate cost.

Turnover:

```text
Turnover = 0.5 × Σ |w_new - w_old|
```

Transaction cost:

```text
Cost =
Σ(|Δposition_i| × market_value × cost_rate_i)
```

Example:

```text
Equity transaction cost = 20 bps
Bond transaction cost    = 10 bps
Gold transaction cost    = 15 bps
```

These are simulation assumptions.

---

# 28. Candidate Allocation Comparison

Generate multiple candidate solutions where practical.

Example:

```text
OPTION A
Aggressive Risk Reduction
Risk: 42
Turnover: 18%
Cost: ₹14L
❌ Turnover constraint

OPTION B
Moderate
Risk: 51
Turnover: 10%
Cost: ₹7L
❌ Liquidity constraint

OPTION C
Minimum Intervention
Risk: 54
Turnover: 5%
Cost: ₹3.2L
✓ VALID
```

The system recommends only a candidate that passes validation.

---

# 29. Independent Validator

This is a critical architecture rule.

```text
Optimizer
   ↓
Candidate
   ↓
Validator
   ↓
PASS / FAIL
```

The validator must independently recalculate the important metrics.

It checks:

```text
✓ weights sum to 100%
✓ no negative weights
✓ position limits
✓ asset-class limits
✓ CVaR
✓ volatility
✓ liquidity
✓ concentration
✓ drawdown
✓ turnover
✓ transaction cost
```

If any hard constraint fails:

```text
FINAL STATUS = FAIL
```

The system must not trust the optimizer's claimed status.

---

# 30. Infeasible Optimization

The system must gracefully handle:

> "No feasible portfolio exists."

Response:

```text
NO FEASIBLE SOLUTION

Reason:
Current hard constraints cannot be satisfied simultaneously.

Action:
Escalate to risk manager.

No rebalance recommendation generated.
```

Never invent a portfolio just to produce an answer.

---

# 31. Reverse Stress Testing

This is the main optional WOW feature.

Normal stress:

> "What happens if the market falls 20%?"

Reverse stress:

> **"What market movement would cause the portfolio to fail?"**

Define a failure condition:

```text
Portfolio loss > 15%
```

Then search scenarios.

Example:

```text
Equity Shock

-5%   → SAFE
-10%  → SAFE
-15%  → SAFE
-20%  → SAFE
-22%  → FAILURE
```

Multifactor example:

```text
Equity       -17%
Credit       -10%
Volatility   +45%

Portfolio loss = 15.3%

→ FAILURE
```

Output:

```text
FAILURE BOUNDARY FOUND

Primary vulnerability:
Equity + credit interaction

Minimum simulated shock:
15.3% portfolio loss
```

---

# 32. Reverse Stress Implementation

For a hackathon, use a bounded grid search.

```python
for equity_shock in equity_grid:
    for credit_shock in credit_grid:
        for volatility_shock in volatility_grid:

            stressed_portfolio = apply_shocks(...)

            loss = calculate_loss(stressed_portfolio)

            if loss >= failure_threshold:
                record_scenario(...)
```

Then rank scenarios using:

```text
1. Failure achieved
2. Smallest shock magnitude
3. Plausibility score
```

Do not attempt an unnecessarily complex institutional reverse-stress framework during the MVP.

---

# 33. Distance to Failure

Show the risk manager:

```text
DISTANCE TO FAILURE

Current
  │
  │
  │  SAFE BUFFER
  │
  ▼
FAILURE BOUNDARY

Equity shock to failure:
-22%
```

This answers:

> "How much worse can the environment become before this portfolio breaks?"

---

# 34. Resilience Score

Optional executive metric:

```text
RESILIENCE SCORE
76 / 100
```

Possible components:

```text
Risk Buffer
Liquidity Buffer
Diversification
Concentration
Stress Resilience
Failure Distance
```

Important:

> The resilience score is a summary. It must never replace the underlying risk metrics and hard constraints.

---

# 35. AI Layer

AI should be added **after the deterministic financial engine is working**.

AI has three jobs:

## 1. Interpret natural language

User:

```text
"What happens if equities fall 15%?"
```

AI converts it into structured parameters:

```json
{
  "scenario": "custom",
  "shocks": {
    "EQUITY_ETF": -0.15
  }
}
```

## 2. Explain results

User:

```text
"Why did you reduce corporate bonds?"
```

AI receives structured facts:

```json
{
  "risk_before": 87,
  "risk_after": 54,
  "top_driver": "CORP_BOND",
  "turnover": 0.05,
  "validation": "PASS"
}
```

Then produces an explanation.

## 3. Summarize

Examples:

```text
"Give me the CRO summary."

"Summarize today's risk."

"What changed after the crash?"
```

---

# 36. AI Safety Rule

The LLM must **never directly determine financial numbers**.

Correct architecture:

```text
User
 ↓
AI
 ↓
Structured Intent
 ↓
Backend
 ↓
Risk / Optimizer
 ↓
Validator
 ↓
Numerical Result
 ↓
AI
 ↓
Explanation
```

Incorrect:

```text
User
 ↓
LLM
 ↓
"Buy 10% bonds"
```

The backend must remain the source of truth.

---

# 37. Decision Explanation

Every recommendation should be explainable using five questions.

### What happened?

```text
Portfolio entered RED because CVaR exceeded the configured limit.
```

### Why?

```text
Equity and corporate-credit exposure were the largest risk contributors.
```

### What changed?

```text
Equity was reduced and cash/government bonds increased.
```

### Why this allocation?

```text
The candidate restored the risk limits while minimizing turnover and transaction cost.
```

### Was it safe?

```text
All hard constraints passed independent validation.
```

---

# 38. Decision Audit Trail

Every important event should be stored.

Example:

```json
{
  "timestamp": "2026-09-05T12:30:00",
  "trigger": [
    "CVAR_BREACH"
  ],
  "state_before": "RED",
  "old_weights": {},
  "new_weights": {},
  "turnover": 0.05,
  "transaction_cost": 320000,
  "validation": "PASSED",
  "status": "SIMULATED_RECOMMENDATION"
}
```

Store:

- timestamp;
- portfolio;
- market state;
- scenario;
- risk metrics;
- control state;
- optimization run;
- candidate allocation;
- transaction cost;
- validation result;
- approval/rejection;
- model/configuration version where practical.

---

# 39. Human Approval

The product should be decision-support, not autonomous execution.

Flow:

```text
Recommendation
      ↓
Risk Manager
      ↓
┌───────────────┐
│ APPROVE       │
│ REJECT        │
└───────────────┘
```

If approved:

```text
Simulated holdings updated
```

If rejected:

```text
Action recorded as REJECTED
```

No real brokerage/execution integration is needed.

---

# 40. Frontend

Use:

```text
React
TypeScript
Vite
Tailwind CSS
Recharts
```

The UI should feel like a **risk command center**, not a generic banking dashboard.

---

# 41. Dashboard

The first screen should answer:

# ARE WE SAFE?

Top cards:

```text
CAPITAL
₹100 Cr

RISK SCORE
42 / 100

CVaR
₹5.1 Cr

LIQUIDITY
125%

RESILIENCE
76 / 100
```

Then:

```text
CONTROL STATE
🟢 GREEN

REGIME
NORMAL

TOP RISK DRIVER
Equity — 41%
```

---

# 42. Dashboard Layout

```text
┌─────────────────────────────────────────────────────────┐
│ SMART CAPITAL GUARD                      🟢 GREEN       │
├───────────┬───────────┬───────────┬─────────────────────┤
│ Capital   │ Risk      │ CVaR      │ Liquidity           │
│ ₹100 Cr   │ 42        │ ₹5.1 Cr   │ 125%                │
├───────────┴───────────┴───────────┴─────────────────────┤
│                                                         │
│ Risk Trend                    Risk Budget               │
│ ──────────────────            ████████░░ 80%            │
│                                                         │
├───────────────────────────┬─────────────────────────────┤
│ Allocation                │ Risk Attribution            │
│                           │                             │
│ Equity       35%          │ Equity          41%        │
│ Gov Bond     25%          │ Credit          32%        │
│ Corp Bond    25%          │ Concentration   17%        │
│ Gold          5%          │ Liquidity       10%        │
│ Cash         10%          │                             │
├───────────────────────────┴─────────────────────────────┤
│ Latest Recommendation                                   │
│ No intervention required                                │
└─────────────────────────────────────────────────────────┘
```

---

# 43. Stress Lab

Provide:

```text
SCENARIO LAB

[ Market Crash ]
[ Rate Shock ]
[ Credit Crisis ]
[ Combined Crisis ]
[ Custom Scenario ]

              [ RUN SIMULATION ]
```

After execution:

```text
BEFORE                 AFTER

Risk: 42               Risk: 86
CVaR: ₹5.1 Cr          CVaR: ₹9.8 Cr
State: GREEN           State: RED
```

Then:

```text
[ OPTIMIZE RESPONSE ]
```

---

# 44. Optimization Screen

Show:

```text
CURRENT ALLOCATION

Equity       35%
Gov Bonds    25%
Corp Bonds   25%
Gold          5%
Cash         10%
```

versus:

```text
RECOMMENDED

Equity       28%
Gov Bonds    30%
Corp Bonds   22%
Gold          5%
Cash         15%
```

Metrics:

```text
Risk Before       86
Risk After        54

CVaR Before       ₹9.8 Cr
CVaR After        ₹5.8 Cr

Turnover           5%
Transaction Cost   ₹3.2L

Validation         ✓ PASS
```

---

# 45. What-if Simulator

Allow the risk manager to change one assumption.

Example:

```text
Equity allocation:
35% ─────────●────── 60%

[ SIMULATE ]
```

Then instantly show:

```text
Risk
CVaR
Liquidity
Concentration
Expected Return
```

This makes the application interactive without requiring additional complex backend infrastructure.

---

# 46. Decision History

Display:

```text
DATE        TRIGGER          ACTION       STATUS

Sep 05      Market Crash     Rebalance    APPROVED
Sep 04      CVaR Warning     Monitor      CLOSED
Sep 03      Liquidity        Rebalance    REJECTED
```

Clicking a record should reveal:

```text
Before
After
Trigger
Risk
Optimization
Validation
Cost
Approval
Explanation
```

---

# 47. API Specification

## GET `/api/health`

Returns:

```json
{
  "status": "ok"
}
```

---

## GET `/api/portfolio`

Returns current portfolio and holdings.

```json
{
  "portfolio_id": "P001",
  "capital": 100000000,
  "holdings": []
}
```

---

## GET `/api/risk`

Calculates current risk.

```json
{
  "risk_score": 42,
  "volatility": 0.14,
  "var": 0.032,
  "cvar": 0.051,
  "drawdown": 0.061,
  "liquidity_ratio": 1.25,
  "concentration": 0.21
}
```

---

## GET `/api/scenarios`

Returns:

```json
[
  {
    "id": "market_crash",
    "name": "Market Crash"
  },
  {
    "id": "rate_shock",
    "name": "Interest Rate Shock"
  }
]
```

---

## POST `/api/scenarios/run`

Request:

```json
{
  "scenario_id": "market_crash"
}
```

Response:

```json
{
  "scenario": "Market Crash",
  "before": {},
  "after": {},
  "breaches": []
}
```

---

## POST `/api/optimize`

Request:

```json
{
  "portfolio_id": "P001",
  "mode": "minimum_intervention"
}
```

Response:

```json
{
  "status": "OPTIMIZED",
  "allocation": {},
  "turnover": 0.05,
  "transaction_cost": 320000
}
```

---

## POST `/api/rebalance`

Request:

```json
{
  "optimization_run_id": "OPT001",
  "decision": "APPROVE"
}
```

Response:

```json
{
  "status": "APPROVED",
  "simulation_updated": true
}
```

---

## POST `/api/evaluate`

This becomes the **main integration endpoint**.

It should perform:

```text
portfolio
 ↓
risk
 ↓
control
 ↓
optimization if required
 ↓
validation
 ↓
decision
```

Example:

```json
{
  "portfolio": {},
  "risk": {},
  "control": {},
  "recommendation": {},
  "validation": {},
  "decision": {}
}
```

---

# 48. Recommended Backend Structure

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── health.py
│   │   ├── portfolio.py
│   │   ├── risk.py
│   │   ├── scenarios.py
│   │   ├── optimize.py
│   │   ├── rebalance.py
│   │   └── evaluate.py
│   │
│   ├── models/
│   │   ├── asset.py
│   │   ├── portfolio.py
│   │   ├── holding.py
│   │   ├── risk_snapshot.py
│   │   ├── optimization.py
│   │   ├── scenario.py
│   │   ├── alert.py
│   │   └── rebalance.py
│   │
│   ├── schemas/
│   │   ├── portfolio.py
│   │   ├── risk.py
│   │   ├── scenario.py
│   │   ├── optimization.py
│   │   └── rebalance.py
│   │
│   ├── services/
│   │   ├── portfolio_service.py
│   │   ├── market_service.py
│   │   ├── risk_engine.py
│   │   ├── attribution.py
│   │   ├── control_engine.py
│   │   ├── optimizer.py
│   │   ├── transaction_cost.py
│   │   ├── validator.py
│   │   ├── scenario_engine.py
│   │   ├── reverse_stress.py
│   │   ├── decision_service.py
│   │   └── explanation_service.py
│   │
│   ├── seed/
│   │   └── seed_database.py
│   │
│   ├── config/
│   │   └── risk_limits.yaml
│   │
│   └── db/
│       ├── session.py
│       └── base.py
│
├── tests/
│   ├── test_risk.py
│   ├── test_control.py
│   ├── test_optimizer.py
│   ├── test_validator.py
│   └── test_scenarios.py
│
├── requirements.txt
└── Dockerfile
```

---

# 49. Frontend Structure

```text
frontend/
│
├── src/
│   ├── components/
│   │   ├── RiskCard.tsx
│   │   ├── PortfolioTable.tsx
│   │   ├── RiskGauge.tsx
│   │   ├── RiskBudget.tsx
│   │   ├── AllocationChart.tsx
│   │   ├── RiskAttribution.tsx
│   │   ├── ScenarioSelector.tsx
│   │   ├── RecommendationCard.tsx
│   │   ├── ValidationPanel.tsx
│   │   └── DecisionTimeline.tsx
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Optimization.tsx
│   │   ├── StressLab.tsx
│   │   └── Decisions.tsx
│   │
│   ├── services/
│   │   └── api.ts
│   │
│   ├── hooks/
│   │   └── usePortfolio.ts
│   │
│   └── App.tsx
│
└── package.json
```

---

# 50. Docker Compose

The minimum infrastructure:

```text
docker-compose.yml

services:

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: capital_guard
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
```

Backend can run locally during development.

For final demo, the backend can also be containerized.

---

# 51. Environment Variables

Example:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/capital_guard

APP_ENV=development

RISK_CONFIDENCE=0.95

DEFAULT_CVAR_LIMIT=0.08
DEFAULT_LIQUIDITY_MIN=1.10
```

Never commit secrets.

---

# 52. Seed Data

The application should start with a deterministic portfolio.

Example:

```text
Initial Capital: ₹100 Cr

Equity ETF       35%
Government Bond  25%
Corporate Bond   25%
Gold              5%
Cash             10%
```

Generate or load historical prices for the risk calculations.

The seed process must create:

```text
Assets
Portfolio
Holdings
Historical Prices
Scenarios
Risk Limits
```

---

# 53. End-to-End Control Algorithm

```python
def evaluate_portfolio(portfolio_id):

    portfolio = portfolio_service.get(portfolio_id)

    market = market_service.get_current_state()

    risk = risk_engine.calculate(
        portfolio=portfolio,
        market=market
    )

    attribution = attribution_engine.calculate(
        portfolio=portfolio,
        market=market
    )

    control = control_engine.evaluate(
        risk=risk
    )

    if control.action == "MONITOR":

        decision_service.record_monitoring_state(
            portfolio,
            risk,
            control
        )

        return build_response(
            portfolio,
            risk,
            attribution,
            control
        )

    candidate = optimizer.optimize(
        portfolio=portfolio,
        risk=risk,
        control=control
    )

    validation = validator.validate(
        portfolio=candidate
    )

    if not validation.passed:

        decision_service.record_failed_optimization(
            portfolio,
            candidate,
            validation
        )

        return {
            "status": "NO_FEASIBLE_RECOMMENDATION",
            "validation": validation
        }

    cost = transaction_cost.calculate(
        old_portfolio=portfolio,
        new_portfolio=candidate
    )

    stress_result = scenario_engine.optional_retest(
        candidate
    )

    decision = decision_service.create(
        portfolio=portfolio,
        candidate=candidate,
        risk=risk,
        validation=validation,
        cost=cost
    )

    return build_response(
        portfolio,
        risk,
        attribution,
        control,
        candidate,
        validation,
        cost,
        stress_result,
        decision
    )
```

---

# 54. Important Separation of Responsibilities

The architecture must preserve this rule:

```text
Market Data
    ↓
Risk Engine
    ↓
CONTROL DECISION
    ↓
Optimizer
    ↓
Validator
```

Not:

```text
LLM
 ↓
Portfolio
```

And not:

```text
Optimizer
 ↓
Automatically execute
```

The optimizer proposes.

The validator checks.

The human approves.

---

# 55. Testing Plan

## 55.1 Risk Engine Tests

Test:

- portfolio return;
- volatility;
- VaR;
- CVaR;
- drawdown;
- concentration;
- liquidity;
- risk contribution.

## 55.2 Control Engine Tests

Test:

```text
GREEN → no action

YELLOW → monitor

ORANGE → prepare

RED → optimize
```

Test hysteresis around thresholds.

## 55.3 Optimizer Tests

Test:

```text
Healthy portfolio
Moderate breach
Severe breach
Infeasible constraints
```

## 55.4 Validator Tests

Critical test:

```text
Optimizer says PASS
Validator independently calculates FAIL

Expected:
FINAL = FAIL
```

## 55.5 Scenario Tests

Test:

```text
Market Crash
Rate Shock
Credit Crisis
Combined Crisis
```

## 55.6 Reverse Stress Tests

Test that:

```text
failure threshold
→ search
→ scenario found
→ scenario actually causes failure
```

---

# 56. 24-Hour Implementation Plan

## Hour 0–1 — Architecture Freeze

Agree on:

```text
Database schema
API contracts
Risk limits
Portfolio
Scenario definitions
Frontend pages
Git workflow
```

Do not keep redesigning the architecture.

---

## Hour 1–4 — Backend Foundation

Build:

```text
FastAPI
SQLAlchemy
PostgreSQL
Models
Database connection
Seed script
```

Goal:

```text
docker compose up
+
database seeded
+
/api/health works
```

---

## Hour 3–8 — Risk Engine

Implement:

```text
Portfolio value
Returns
Covariance
Volatility
VaR
CVaR
Drawdown
Liquidity
Concentration
Risk contribution
Risk score
```

Goal:

```text
GET /api/risk
```

returns real calculations.

---

## Hour 5–9 — Control Engine

Implement:

```text
thresholds
risk states
hysteresis
dynamic limits
alerts
```

Goal:

```text
Risk breach
→ RED
```

---

## Hour 7–12 — CVXPY Optimization

Implement:

```text
weights
constraints
turnover
transaction cost
minimum intervention
```

Goal:

```text
POST /api/optimize
```

returns a feasible recommendation.

---

## Hour 9–13 — Validator

Implement independent validation.

Goal:

```text
candidate
→ validator
→ PASS/FAIL
```

---

## Hour 10–15 — Scenario Engine

Implement:

```text
Market Crash
Rate Shock
Credit Crisis
Combined Crisis
```

Goal:

```text
scenario
→ stressed portfolio
→ stressed risk
```

---

## Hour 13–17 — Frontend

Build:

```text
Dashboard
Portfolio
Optimization
Stress Lab
Decision History
```

Prioritize functionality over decorative UI.

---

## Hour 16–19 — Reverse Stress

If the core system is stable:

```text
failure threshold
→ shock grid
→ search
→ failure boundary
```

---

## Hour 18–21 — AI Explanation

Add:

```text
Why did this happen?
Why this allocation?
Summarize risk.
```

Only expose backend facts to the LLM.

---

## Hour 21–23 — Integration

Run:

```text
Normal
→ Crash
→ RED
→ Optimize
→ Validate
→ Approve
→ Updated portfolio
```

Fix integration bugs.

---

## Hour 23–24 — Demo Freeze

Stop adding features.

Test:

```text
Fresh database
Fresh backend
Fresh frontend
Complete demo
```

Prepare screenshots/video/fallback data if necessary.

---

# 57. Team Split

## Developer 1 — Risk & Data

Own:

```text
Market data
Portfolio
Risk Engine
CVaR
VaR
Volatility
Risk attribution
```

## Developer 2 — Optimization & Control

Own:

```text
Control Engine
Safe Operating Envelope
CVXPY
Transaction Cost
Validator
```

## Developer 3 — Scenario & Resilience

Own:

```text
Scenario Engine
Stress Testing
Reverse Stress
Resilience
```

## Developer 4 — Frontend & AI

Own:

```text
React UI
Charts
Dashboard
Scenario controls
AI explanation
```

Everyone integrates against the agreed API.

---

# 58. Git Workflow

Use branches:

```text
main

feature/risk-engine
feature/optimizer
feature/scenario-engine
feature/frontend
```

Do not work directly on main.

Commit small, meaningful changes:

```text
feat: add cvar calculation

feat: add crisis control state

feat: add cvxpy optimizer

feat: add scenario engine

feat: add validator

feat: add dashboard risk cards
```

Merge working components early.

---

# 59. Demo Scenario

The final demo should tell one coherent story.

## Step 1 — Healthy Portfolio

```text
Risk Score: 42
CVaR: ₹5.1 Cr
Liquidity: 125%
State: GREEN
```

System:

> Portfolio is within the safe operating envelope. No intervention is required.

---

## Step 2 — Trigger Market Crash

User selects:

```text
MARKET CRASH
```

Click:

```text
RUN SIMULATION
```

---

## Step 3 — Risk Deteriorates

Example:

```text
Risk Score: 42 → 86

CVaR: ₹5.1 Cr → ₹9.8 Cr

State: GREEN → RED
```

Dashboard immediately shows the breach.

---

## Step 4 — Diagnosis

Show:

```text
PRIMARY RISK DRIVER
Equity

SECONDARY DRIVER
Corporate Credit

CONDITION
Correlation / tail risk increased
```

---

## Step 5 — Control Engine

```text
RED

Intervention Required
```

System automatically offers:

```text
OPTIMIZE RESPONSE
```

---

## Step 6 — Optimization

Show:

```text
CURRENT              RECOMMENDED

Equity 35%           Equity 28%
Gov    25%           Gov    30%
Corp   25%           Corp   22%
Gold    5%           Gold    5%
Cash   10%           Cash   15%
```

---

## Step 7 — Cost

```text
Turnover: 5%

Estimated Transaction Cost:
₹3.2L
```

---

## Step 8 — Validation

```text
✓ Allocation
✓ CVaR
✓ Liquidity
✓ Concentration
✓ Turnover
✓ Transaction Cost

VALIDATION: PASS
```

---

## Step 9 — Approval

Risk manager clicks:

```text
APPROVE REBALANCE
```

The simulation updates holdings.

---

## Step 10 — After State

```text
Risk Score: 54

CVaR: ₹5.8 Cr

Liquidity: 127%

State: GREEN / SAFE

Validation: PASS
```

---

## Step 11 — Reverse Stress

Open:

```text
STRESS LAB → REVERSE STRESS
```

Failure condition:

```text
Portfolio loss > 15%
```

System searches.

Example:

```text
Equity       -17%
Credit       -10%
Volatility   +45%

Loss: 15.3%

FAILURE BOUNDARY FOUND
```

---

# 60. Judge-Facing Differentiation

Do not claim:

> "We invented CVaR."

Do not claim:

> "No existing financial software can do this."

Do not claim:

> "Our AI predicts the market."

The stronger and more defensible story is:

> **Smart Capital Guard combines established financial risk techniques into a focused closed-loop control workflow.**

The differentiation is the combination:

```text
Risk Measurement
+
Dynamic Control
+
Minimum Intervention
+
Independent Validation
+
Stress Testing
+
Reverse Stress
+
Auditability
+
Explainability
```

---

# 61. Why the System Is More Than an Optimizer

A normal optimizer:

```text
Input
 ↓
Optimization
 ↓
Portfolio
```

Smart Capital Guard:

```text
Market
 ↓
Risk
 ↓
Control State
 ↓
Diagnosis
 ↓
Optimization
 ↓
Cost
 ↓
Validation
 ↓
Stress
 ↓
Human Approval
 ↓
Audit
```

This distinction should be visible in the demo.

---

# 62. What We Should NOT Build

For the 24-hour MVP, do not spend time on:

- real brokerage integration;
- autonomous trading;
- reinforcement-learning trading;
- multi-agent LLM architecture;
- complex derivatives pricing;
- large-scale alternative data;
- production-grade market data infrastructure;
- institutional authentication;
- complex regulatory capital calculations;
- excessive ML models;
- dozens of asset classes;
- complicated execution algorithms.

A reliable end-to-end system is worth more than ten incomplete features.

---

# 63. MVP vs WOW

## MUST WORK

```text
✓ Portfolio
✓ Market data
✓ Risk Engine
✓ CVaR
✓ Risk score
✓ Control Engine
✓ Dynamic limits
✓ CVXPY optimizer
✓ Transaction cost
✓ Validator
✓ Scenario engine
✓ Rebalance recommendation
✓ PostgreSQL audit
✓ Dashboard
```

## HIGH-VALUE

```text
✓ Risk attribution
✓ What-if simulator
✓ Before/after comparison
✓ Decision history
✓ AI explanation
```

## WOW

```text
✓ Reverse stress testing
✓ Distance to failure
✓ Resilience score
```

## OPTIONAL

```text
HMM regime detection
Correlation network
Advanced portfolio algorithms
```

---

# 64. Definition of Done

The product is complete when a judge can do the following without developer intervention:

```text
1. Open dashboard
2. See current portfolio
3. See current risk
4. See GREEN state
5. Select Market Crash
6. Run simulation
7. Watch risk increase
8. See RED state
9. See risk drivers
10. Generate optimization
11. See target allocation
12. See transaction cost
13. See validation
14. Approve simulated rebalance
15. See risk decrease
16. Open decision history
17. Open reverse stress
18. Find failure boundary
19. Ask why
20. Receive explanation
```

If this sequence works, the project has a coherent story from beginning to end.

---

# 65. Final Product Workflow

```text
                 SMART CAPITAL GUARD
                         │
                         ▼
                  MARKET DATA
                         │
                         ▼
                    PORTFOLIO
                         │
                         ▼
                    RISK ENGINE
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       RISK ATTRIBUTION       RISK BUDGET
              │                     │
              └──────────┬──────────┘
                         ▼
                 CONTROL ENGINE
                         │
                 SAFE ENVELOPE
                         │
          ┌──────────────┴──────────────┐
          │                             │
      SAFE / MONITOR              BREACH / CRISIS
                                        │
                                        ▼
                                  CVXPY OPTIMIZER
                                        │
                                  MIN INTERVENTION
                                        │
                                        ▼
                               TRANSACTION COST
                                        │
                                        ▼
                                   VALIDATOR
                                  /          \
                               FAIL          PASS
                                │             │
                                ▼             ▼
                            ESCALATE      RECOMMEND
                                              │
                                              ▼
                                      HUMAN APPROVAL
                                              │
                                              ▼
                                      SIMULATED REBALANCE
                                              │
                                              ▼
                                        STRESS RETEST
                                              │
                                              ▼
                                    REVERSE STRESS
                                              │
                                              ▼
                                      FAILURE BOUNDARY
                                              │
                                              ▼
                                      DECISION AUDIT
                                              │
                                              ▼
                                         REASSESS
```

---

# 66. Final Product Pitch

## The problem

Risk managers need to continuously understand whether a portfolio remains within acceptable risk limits and what action should be taken when conditions deteriorate.

## The solution

Smart Capital Guard creates a closed-loop risk-control system that:

- measures portfolio risk;
- detects breaches;
- identifies risk drivers;
- dynamically adjusts risk constraints;
- finds a minimum-disruption rebalance;
- calculates intervention cost;
- independently validates the result;
- stress-tests the portfolio;
- finds its failure boundary;
- records the decision;
- and keeps the human risk manager in control.

## The key idea

> **Don't continuously optimize the portfolio. Control the portfolio's risk and intervene only when necessary.**

## The WOW

> **Don't only show what happens during a crash. Work backwards from failure and show how much stress the portfolio can actually withstand.**

---

# 67. Final Architecture Decision

### DO NOT REPLACE THE LEADER'S PROJECT.

Use the leader's architecture as the foundation:

```text
Smart Capital Guard
```

Then add:

```text
Safe Operating Envelope
Risk Attribution
Minimum-Intervention Optimization
Stress Testing
Reverse Stress Testing
Independent Validation
Decision Explanation
```

The final product is therefore:

# **SMART CAPITAL GUARD**
### *Adaptive Capital Risk-Control & Resilience Platform*

with the following core loop:

```text
OBSERVE
→ MEASURE
→ DETECT
→ DIAGNOSE
→ DECIDE
→ OPTIMIZE
→ VALIDATE
→ STRESS
→ EXPLAIN
→ AUDIT
→ REASSESS
```

---

# 68. Final Technical Principle

The most important implementation rule for the whole project:

```text
                 AI
                  │
             EXPLAINS
                  │
                  ▼
┌──────────────────────────────────────┐
│       DETERMINISTIC ENGINE           │
│                                      │
│ Risk → Control → Optimize → Validate │
│                                      │
│       SOURCE OF TRUTH                │
└──────────────────────────────────────┘
                  │
                  ▼
             HUMAN DECISION
```

**AI explains.**

**Quantitative models calculate.**

**The control engine decides whether intervention is required.**

**The optimizer proposes.**

**The validator enforces hard constraints.**

**The human approves.**

**PostgreSQL records what happened.**

That is the final Smart Capital Guard product.
