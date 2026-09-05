# AEGIS — Complete Institutional Capital Resilience & Risk-Control System
## Technical Architecture, Data, AI/RAG, Backend, API, Prediction, UI/UX & Implementation Specification

**Version:** Hackathon build specification  
**Objective:** Transform the Milestone 1 deterministic control-loop prototype into a coherent risk-manager decision-support system.

---

## 1. Product Definition

AEGIS is not a stock-picking application and not an autonomous trading bot.

Its purpose is to answer, continuously and quickly:

> **Is the portfolio still operating safely? If not, what changed, why does it matter, how could it fail, and what is the minimum defensible intervention?**

The final closed loop is:

```text
DATA
  ↓
QUANT RISK
  ↓
REGIME / ANOMALY INTELLIGENCE
  ↓
CONTAGION
  ↓
SAFE OPERATING ENVELOPE
  ↓
FORWARD + REVERSE STRESS
  ↓
MINIMUM INTERVENTION
  ↓
INDEPENDENT VALIDATION
  ↓
RAG / POLICY EVIDENCE
  ↓
AI RISK MANAGER
  ↓
HUMAN APPROVAL
  ↓
PORTFOLIO UPDATE
  ↓
AUDIT + OUTCOME
```

Core rule:

```text
AI detects.
Deterministic rules govern.
Optimizer proposes.
Validator verifies.
LLM explains.
Human approves.
```

---

# 2. What the Finished System Must Do

A risk officer should be able to open one screen and immediately answer:

1. **Are we safe?**
2. **What changed?**
3. **Where is the risk?**
4. **Why did risk change?**
5. **Which assets/clusters are causing it?**
6. **How close are we to failure?**
7. **What happens under a plausible shock?**
8. **What is the smallest corrective action?**
9. **Does the action satisfy mathematical and policy constraints?**
10. **Why is AEGIS recommending it?**
11. **What evidence supports the recommendation?**
12. **What happens if we do nothing?**
13. **Should I approve or reject?**

AEGIS should reduce the time required to answer these questions.

---

# 3. System Architecture

```text
                         ┌───────────────────────────┐
                         │ MARKET + PORTFOLIO DATA    │
                         │ Prices / Returns /        │
                         │ Positions / News / Policy │
                         └─────────────┬─────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │ DATA NORMALIZATION       │
                          │ Validation + timestamps  │
                          └────────────┬────────────┘
                                       │
              ┌────────────────────────┼─────────────────────────┐
              │                        │                         │
              ▼                        ▼                         ▼
       QUANT ENGINE               REGIME AI                NEWS/RAG
              │                        │                         │
              │                        ▼                         │
              │                CONTAGION ENGINE                  │
              │                        │                         │
              └───────────────┬────────┴─────────────────────────┘
                              ▼
                    ┌─────────────────────┐
                    │ CONTROL ENGINE       │
                    │ Safe Envelope        │
                    │ Thresholds/Hysteresis│
                    │ Risk Budgets         │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              FORWARD STRESS        REVERSE STRESS
                    │                     │
                    └──────────┬──────────┘
                               ▼
                    MINIMUM INTERVENTION
                         OPTIMIZER
                               │
                               ▼
                    MULTI-GATE VALIDATOR
                               │
                               ▼
                    RAG POLICY / EVIDENCE
                               │
                               ▼
                       AI RISK MANAGER
                               │
                               ▼
                       HUMAN APPROVAL
                               │
                               ▼
                       PORTFOLIO UPDATE
                               │
                               ▼
                       AUDIT + OUTCOME
```

---

# 4. Recommended Technology Stack

## Backend

| Layer | Technology | Purpose |
|---|---|---|
| API | FastAPI | REST API |
| Language | Python 3.11+ | Quant + AI services |
| Numerical | NumPy, SciPy | Calculations |
| Data | pandas | Time series |
| ML | scikit-learn | anomaly/prediction models |
| Regime | hmmlearn or custom HMM | regime classification |
| Volatility | EWMA / GARCH implementation | risk forecasting |
| Optimization | CVXPY | minimum intervention |
| Validation | Python deterministic validators | safety gates |
| ORM | SQLAlchemy | database access |
| Database | PostgreSQL | portfolio, market, audit, model outputs |
| Vector search | pgvector | RAG embeddings |
| Cache | Redis (optional) | latest market/risk state |
| Scheduling | APScheduler for MVP | periodic ingestion/recalculation |
| LLM | LLM API | grounded explanation/copilot |

Do not create a microservice architecture for the hackathon. Keep one FastAPI application with clean service boundaries.

## Frontend

If the existing frontend is React/Vite, keep it rather than rewriting it solely for architecture purity.

Recommended:

```text
React + TypeScript
Vite
Tailwind CSS
Recharts / ECharts
TanStack Query
```

If Angularity/Antigravity is generating the UI, give it the UI contract and state model below; do not let it invent the information hierarchy.

---

# 5. Data Architecture

AEGIS needs four classes of data.

## A. Portfolio Data

```text
portfolio_id
symbol
security_name
asset_class
sector
currency
quantity
price
market_value
weight
cost_basis
liquidity_score
```

## B. Historical Market Data

At minimum:

```text
timestamp
symbol
open
high
low
close
adjusted_close
volume
```

Derived:

```text
daily_return
rolling_return
realized_volatility
drawdown
correlation
beta
```

## C. Market Context

```text
market_index_return
volatility_index/proxy
interest_rate
credit_spread
currency
breadth
volume
macro indicators
```

## D. Knowledge / Evidence

```text
policy documents
investment mandates
risk limits
regulatory documents
historical crisis research
market commentary/news
```

---

# 6. Data Ingestion Pipeline

```text
External Source
      ↓
Data Adapter
      ↓
Schema Validation
      ↓
Timestamp / Currency Normalization
      ↓
Duplicate Detection
      ↓
Missing Data Handling
      ↓
PostgreSQL
      ↓
Feature Generation
      ↓
Risk / ML Engines
```

Use adapters rather than coupling business logic to a provider:

```python
class MarketDataProvider:
    def get_prices(self, symbols, start, end): ...
    def get_latest(self, symbols): ...
    def get_market_indicators(self): ...
```

Then implement:

```text
CsvMarketDataProvider       # guaranteed hackathon demo
LiveMarketDataProvider      # live feed adapter
```

For the hackathon, the CSV/seeding adapter guarantees reproducibility. A live provider can be connected separately.

For a production institutional deployment, use a licensed market-data provider/exchange feed rather than depending on an unofficial public endpoint.

---

# 7. Minimum Seed Dataset

Do not wait for live data before building the system.

Create a reproducible dataset:

```text
data/
├── market/
│   ├── prices.csv
│   ├── market_indices.csv
│   └── indicators.csv
├── portfolio/
│   └── baseline_portfolio.json
└── policies/
    ├── investment_policy_statement.md
    ├── regulatory_guidance.md
    └── historical_crisis_research.md
```

The seeded portfolio should reproduce the Milestone 1 baseline.

Example:

```text
Capital: ₹1.00 Cr
Baseline Risk: ~28
Envelope: GREEN
```

Then the crash scenario must reproduce the crisis state.

---

# 8. Data Refresh Model

For the MVP:

```text
Every refresh:
    ingest latest market data
    ↓
    calculate returns/features
    ↓
    update regime
    ↓
    update contagion
    ↓
    calculate portfolio risk
    ↓
    evaluate envelope
    ↓
    generate recommendation if required
```

Do not continuously recalculate expensive optimization.

Only optimize when:

```text
intervention_required == true
```

or when the risk officer explicitly requests a recommendation.

---

# 9. Master State Contract

Create:

```text
GET /api/state/master
```

This is the primary read model for the frontend and Copilot.

```typescript
interface AEGISMasterState {
  as_of: string;

  portfolio: {
    id: string;
    name: string;
    total_capital: number;
    holdings: Holding[];
  };

  market: {
    regime: "CALM" | "TRANSITION" | "CRISIS";
    regime_confidence: number;
    regime_drivers: string[];

    contagion: {
      average_normal_correlation: number;
      average_stressed_correlation: number;
      contagion_spread: number;
      clusters: ContagionCluster[];
    };
  };

  risk: {
    expected_return: number;
    volatility: number;
    var_95: number;
    cvar_95: number;
    max_drawdown: number;
    liquidity_ratio: number;
    concentration_hhi: number;
    composite_score: number;

    operating_envelope: "GREEN" | "YELLOW" | "ORANGE" | "RED";
    risk_status: "SAFE" | "CAUTION" | "WARNING" | "CRISIS";
    intervention_required: boolean;
  };

  prediction: {
    forecast_horizon_days: number;
    predicted_volatility: number;
    probability_of_breach: number;
    predicted_regime: string;
    confidence: number;
    drivers: string[];
  };

  resilience: {
    distance_to_failure: number;
    distance_to_failure_pct: string;
    resilience_score: number;
    critical_shock_multiplier: number;
    status: "RESILIENT" | "MODERATE" | "VULNERABLE";
  };

  active_recommendation: Recommendation | null;
}
```

Every frontend section should map to this state rather than independently calculating financial logic.

---

# 10. Quant Risk Engine

File:

```text
backend/app/services/risk_engine.py
```

Calculate:

## Portfolio return

```text
μp = wᵀμ
```

## Volatility

```text
σp = sqrt(wᵀΣw)
```

## Parametric VaR

```text
VaR95 = -(μp - 1.645σp)
```

## CVaR

Prefer historical simulation for the final implementation:

```text
1. Generate historical portfolio returns
2. Sort losses
3. Select worst 5%
4. Average tail losses
```

This is easier to explain to a risk officer than relying only on a closed-form approximation.

## Drawdown

```text
peak = cumulative wealth running maximum
drawdown = 1 - wealth / peak
max_drawdown = max(drawdown)
```

## Concentration

Calculate both:

```text
HHI_weight = Σ wi²
```

and risk contribution concentration:

```text
HHI_risk = Σ RCi²
```

## Liquidity

Create a transparent liquidity score based on:

```text
asset liquidity
position size
estimated liquidation horizon
market volume
stress haircut
```

---

# 11. Risk Score

Keep the composite risk score deterministic.

Example conceptual model:

```text
Risk Score =
    weighted(
        volatility risk,
        drawdown risk,
        liquidity risk,
        concentration risk,
        stress risk
    )
```

Do not allow the LLM to produce the score.

The LLM only receives the already calculated score.

---

# 12. Safe Operating Envelope

Centralize thresholds.

```text
GREEN:
    score < 40

YELLOW:
    40 <= score < 60

ORANGE:
    60 <= score < 80

RED:
    score >= 80
```

Also define action policy:

```text
GREEN  → HOLD
YELLOW → MONITOR
ORANGE → PROTECT / PREPARE
RED    → INTERVENTION REQUIRED
```

Add hysteresis to prevent:

```text
GREEN → YELLOW → GREEN → YELLOW
```

from causing constant trading.

Example:

```text
enter RED at >= 80
exit RED only below 75
```

The exact hysteresis values should be configurable.

---

# 13. Market Regime Prediction

File:

```text
backend/app/services/regime_service.py
```

## Model

Use an HMM for the regime layer.

Features:

```text
20-day annualized volatility
rolling drawdown
return momentum
correlation velocity
volatility acceleration
```

Output:

```json
{
  "regime": "CRISIS",
  "confidence": 0.87,
  "drivers": [
    "Volatility acceleration",
    "Correlation convergence",
    "Drawdown deterioration"
  ]
}
```

The HMM should be trained on historical market features.

Do not train it on the risk score itself because that would create a circular dependency.

---

# 14. Prediction Layer

Prediction should not mean:

> "AEGIS predicts that AAPL will rise 4.2%."

That is unnecessary for the product.

The valuable predictions are **risk predictions**.

Build three prediction outputs:

### A. Volatility forecast

```text
Forecast next 1 / 5 / 20 days
```

Use:

```text
EWMA first
GARCH if time permits
```

### B. Regime probability

```text
P(CALM)
P(TRANSITION)
P(CRISIS)
```

### C. Breach probability

Predict:

```text
P(risk_score >= 80 within next N days)
```

A simple calibrated classifier can use:

```text
recent volatility
volatility change
drawdown
correlation
liquidity
market return
regime probabilities
```

This produces a useful risk-manager statement:

```text
Current Risk: 67 ORANGE

Predicted 5-day breach probability: 72%

Primary drivers:
• volatility acceleration
• falling liquidity
• rising correlation
```

This is much more actionable than stock-price prediction.

---

# 15. Contagion Engine

File:

```text
backend/app/services/contagion_service.py
```

Calculate:

```text
Normal correlation matrix
Stress correlation matrix
```

Then:

```text
contagion_spread =
    average_stressed_corr -
    average_normal_corr
```

Cluster assets using hierarchical clustering.

For each cluster calculate:

```text
capital exposure
risk contribution
stress correlation
```

Output:

```json
{
  "cluster": "Equity Growth",
  "assets": ["A", "B", "C"],
  "capital_exposure": 0.46,
  "risk_contribution": 0.71,
  "stress_correlation": 0.81
}
```

---

# 16. Forward Stress Testing

File:

```text
backend/app/services/scenario_engine.py
```

Supported scenarios:

```text
Market Crash
Stagflation
Rate Shock
Credit Shock
Liquidity Shock
Custom Shock
```

Each scenario modifies:

```text
returns
volatility
correlation
liquidity
```

Then rerun the risk engine.

Output:

```text
baseline risk
stressed risk
risk delta
drawdown
volatility
liquidity
envelope
intervention_required
```

---

# 17. Reverse Stress Testing

File:

```text
backend/app/services/reverse_stress.py
```

Input:

```json
{
  "failure_type": "LOSS",
  "threshold": 0.15
}
```

Search over plausible shocks.

Example:

```text
Equity:       -5% → -6% → -7% → ...
Credit:       -2% → -3% → ...
Rates:        +0.5 → +1.0 → ...
Liquidity:    0% → -5% → ...
Correlation:  normal → stressed
```

Find the smallest combination producing:

```text
portfolio_loss >= threshold
```

Also support:

```text
failure_type = "RISK_SCORE"
threshold = 80
```

Output:

```text
minimum_failure_scenario
estimated_loss
risk_score_at_failure
distance_to_failure
resilience_score
```

---

# 18. Resilience Score

Do not make resilience another arbitrary AI score.

Define a deterministic formula from:

```text
distance to failure
liquidity buffer
risk margin
concentration margin
stress tolerance
```

Example conceptual interpretation:

```text
80–100 → RESILIENT
50–79  → MODERATE
0–49   → VULNERABLE
```

The exact weights should live in configuration.

---

# 19. Minimum Intervention Optimizer

Keep the existing CVXPY implementation.

Objective:

```text
minimize:

  deviation from current weights
+ turnover penalty
+ portfolio risk
- expected return reward
```

Subject to:

```text
Σw = 1
w >= 0
equity <= dynamic cap
cash >= dynamic floor
volatility <= ceiling
max asset <= 50%
```

Add policy constraints later:

```text
sector cap
issuer cap
asset-class cap
liquidity floor
CVaR ceiling
```

Output:

```json
{
  "current_weights": {...},
  "proposed_weights": {...},
  "turnover": 0.16,
  "transaction_cost": 12500,
  "expected_risk_before": 84.0,
  "expected_risk_after": 31.0
}
```

---

# 20. Multi-Gate Validator

File:

```text
backend/app/services/validator.py
```

### Gate 1 — Mathematical

```text
Budget
Long-only
Asset cap
```

### Gate 2 — Risk

```text
Volatility
VaR/CVaR
Drawdown
Liquidity
Concentration
```

### Gate 3 — Policy

```text
Investment mandate
Risk limits
Regulatory constraints
```

### Gate 4 — Execution

```text
Turnover
Transaction cost
Minimum trade size
Liquidity feasibility
```

Final:

```json
{
  "valid": true,
  "status": "PASS",
  "checks": [],
  "violations": []
}
```

If any hard gate fails:

```text
FAIL → BLOCK
```

The LLM must never override a validator failure.

---

# 21. RAG Architecture

File:

```text
backend/app/services/rag_service.py
```

Pipeline:

```text
Documents
   ↓
Parser
   ↓
Chunker
   ↓
Metadata
   ↓
Embedding
   ↓
pgvector
   ↓
Retriever
   ↓
Top-k Evidence
```

Each chunk should contain metadata:

```text
document
title
section
page
effective_date
source_url
document_type
jurisdiction
```

For the hackathon knowledge base:

```text
data/policies/
├── investment_policy_statement.md
├── regulatory_guidance.md
└── historical_crisis_research.md
```

For real regulatory grounding, use official regulator material and preserve publication/effective dates. SEBI's current site provides master circulars and regulations, including 2026 materials, so the ingestion layer should treat regulatory documents as versioned evidence rather than one static document. citeturn0search0turn0search2

---

# 22. RAG Must Be Grounded

Never allow:

```text
Question
 ↓
LLM
 ↓
made-up financial rule
```

Instead:

```text
Question
 ↓
Retrieve
 ↓
Evidence
 ↓
LLM
 ↓
Answer with citations
```

The Copilot response should preserve:

```text
claim
source
section
evidence
```

If no evidence exists:

```text
"I could not find supporting policy evidence in the AEGIS knowledge base."
```

---

# 23. AI Risk Manager

File:

```text
backend/app/services/copilot_service.py
```

System prompt concept:

```text
You are the AEGIS Risk Manager Copilot.

You may reason only from:
1. structured AEGIS quantitative facts
2. retrieved evidence
3. validated recommendations

Never invent:
- prices
- risk scores
- policy limits
- portfolio weights
- regulatory requirements

Never execute trades.

Explain:
1. What changed
2. Why it matters
3. What is causing the risk
4. What AEGIS recommends
5. Why the intervention is minimal
6. What could happen if action is delayed
7. Which evidence supports the conclusion
```

---

# 24. Copilot Tools

Give the model read-only tools:

```text
get_master_state()
get_risk_breakdown()
get_regime()
get_contagion()
run_forward_stress()
run_reverse_stress()
get_active_recommendation()
validate_recommendation()
search_policy()
get_audit_history()
```

Only backend-controlled endpoints can:

```text
approve_rebalance()
reject_rebalance()
```

Approval should remain a human action.

---

# 25. Example Copilot Conversation

User:

> Why are we in RED?

AEGIS:

```text
The portfolio entered the RED operating envelope because
stressed volatility and drawdown exceeded the configured
resilience limits.

The largest contributor is the equity risk cluster, which
accounts for 71% of portfolio risk under the stressed
correlation matrix.

Liquidity also fell below the crisis reserve requirement.

The proposed intervention reduces the concentrated equity
exposure while increasing defensive liquidity.
```

User:

> Why this trade?

AEGIS:

```text
The optimizer selected the smallest allocation change that
restores the portfolio inside the crisis constraints.

The proposal reduces turnover compared with rebuilding the
portfolio from scratch.

All required validator gates passed.
```

User:

> What if I don't approve?

AEGIS:

```text
Reverse stress testing indicates the portfolio is close to
its failure boundary. A further combination of equity,
credit and liquidity shocks could breach the configured loss
tolerance.

The historical crisis evidence retrieved by AEGIS shows why
correlation and liquidity deterioration can amplify losses
during systemic events.
```

---

# 26. Frontend — The Most Important Design Principle

The risk manager should **not have to hunt for information**.

Do not build:

```text
20 cards
+
10 charts
+
15 metrics
+
giant tables
```

Everything is not equally important.

Use an information hierarchy:

```text
LEVEL 1
"What requires my attention now?"

LEVEL 2
"Why?"

LEVEL 3
"How bad?"

LEVEL 4
"What should I do?"

LEVEL 5
"Can I trust it?"

LEVEL 6
"Give me details."
```

---

# 27. Dashboard Layout

Use this layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ AEGIS                                      ₹1.00 Cr          │
│ Adaptive Capital Resilience & Risk-Control System            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 CRISIS        Risk 84        Regime CRISIS   ↑ 17.3      │
│  INTERVENTION REQUIRED                                       │
│                                                              │
├───────────────────────────────┬──────────────────────────────┤
│ RISK NOW                      │ WHAT CHANGED                 │
│                               │                              │
│ 84 / 100                      │ Volatility      ↑            │
│ ████████████████              │ Drawdown        ↑            │
│                               │ Liquidity       ↓            │
│ Volatility  29.4%             │ Correlation     ↑            │
│ VaR         14.8%             │ Equity risk     ↑            │
│ CVaR        18.2%             │                              │
│ Drawdown    23.7%             │ Primary driver:              │
│ Liquidity   31%               │ Equity stress + contagion    │
│ HHI         0.24              │                              │
├───────────────────────────────┴──────────────────────────────┤
│                                                              │
│                    RISK EXPLANATION                          │
│                                                              │
│  WHY IS THIS HAPPENING?                                      │
│  Market volatility has accelerated and correlations between │
│  major risk assets have converged.                           │
│                                                              │
├───────────────────────────────┬──────────────────────────────┤
│ CONTAGION LENS                │ DISTANCE TO FAILURE           │
│                               │                              │
│ Normal Corr     0.42          │ Failure Loss: >15%           │
│ Stress Corr     0.81          │ Distance: 1.2x              │
│ Spread          +0.39         │ Resilience: VULNERABLE       │
│                               │                              │
│ Equity Cluster  71% risk      │ [Run Reverse Stress]         │
├───────────────────────────────┴──────────────────────────────┤
│                                                              │
│ STRESS TEST LAB                                              │
│ [Market Crash] [Rate Shock] [Credit Shock] [Custom]         │
│                                                              │
│ Before Risk: 28        After Stress: 84                     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ AEGIS RECOMMENDATION                                         │
│                                                              │
│        CURRENT                  PROPOSED                    │
│ Equity  46%     ─────────→      30%                         │
│ Bonds   24%     ─────────→      32%                         │
│ Cash    10%     ─────────→      18%                         │
│                                                              │
│ Expected Risk: 84 → 31     Turnover: 16%                    │
│                                                              │
│ VALIDATOR: ✓ PASS                                            │
│ ✓ Mathematical  ✓ Risk  ✓ Policy  ✓ Execution              │
│                                                              │
│                 [ APPROVE REBALANCE ]                        │
│                 [ REJECT ]                                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ AI RISK MANAGER                                              │
│ Ask: "Why are we in crisis?"                                 │
│                                                              │
│ [ Ask AEGIS... ]                                             │
└──────────────────────────────────────────────────────────────┘
```

---

# 28. What Should Be "Above the Fold"

The risk manager should immediately see only these:

### 1. Current state

```text
GREEN / YELLOW / ORANGE / RED
```

### 2. Risk score

```text
84
```

### 3. Market regime

```text
CRISIS — 87%
```

### 4. What changed

```text
Volatility ↑
Drawdown ↑
Liquidity ↓
Correlation ↑
```

### 5. Main risk driver

```text
Equity cluster → 71% risk contribution
```

### 6. Required action

```text
INTERVENTION REQUIRED
```

### 7. Proposed action

```text
Current → Proposed
```

### 8. Validation

```text
PASS
```

That's the executive risk surface.

Everything else can be one click deeper.

---

# 29. UI Navigation

Use only a few major sections:

```text
┌──────────────────────┐
│ AEGIS                │
│                      │
│ ● Overview            │
│ ● Risk                │
│ ● Stress Lab          │
│ ● Portfolio           │
│ ● Recommendations     │
│ ● AI Risk Manager     │
│ ● Audit               │
└──────────────────────┘
```

Do not make separate navigation for every metric.

---

# 30. Risk Page

The detailed risk page should answer:

```text
WHERE IS THE RISK?
```

Show:

```text
Risk contribution by asset
Risk contribution by sector
Risk contribution by cluster
Concentration
Liquidity
Correlation
```

Use visual hierarchy:

```text
Asset                 Risk Contribution

NVDA                  █████████████ 22%
AAPL                  ██████████    17%
MSFT                  ███████       12%
...
```

Then a correlation matrix can sit below it for users who want detail.

---

# 31. Stress Lab

This page answers:

```text
WHAT IF?
```

Top:

```text
Scenario Selector

[ Market Crash ]
[ Rate Shock ]
[ Credit Shock ]
[ Liquidity Shock ]
[ Stagflation ]
[ Custom ]
```

Then:

```text
                    BEFORE       AFTER

Risk Score             28          84
Volatility             12%         29%
Drawdown                10%         23.7%
Liquidity              48%         31%
Envelope              GREEN        RED
```

Then show the waterfall:

```text
Baseline
   ↓
Market loss
   ↓
Volatility impact
   ↓
Correlation impact
   ↓
Liquidity impact
   ↓
Final risk
```

This explains **how the risk is happening**, not merely that the number changed.

---

# 32. Reverse Stress UI

Make this a separate high-impact visualization.

```text
YOUR FAILURE BOUNDARY

Loss tolerance: 15%

                 ┌───────────────┐
                 │ SAFE           │
                 │                │
                 │      ●         │
                 │     /          │
                 │    /            │
                 ├───X────────────┤
                 │ FAILURE        │
                 └───────────────┘

Minimum failure scenario:
Equity -8.5%
Credit  -4.0%
Liquidity haircut -15%
```

Then:

```text
Resilience: 42 / 100
Status: VULNERABLE
```

---

# 33. Recommendation UI

This is where the risk manager makes the decision.

Do not hide the action inside a chart.

Use:

```text
┌──────────────────────────────────────────────┐
│ AEGIS RECOMMENDS                             │
│                                              │
│ CRISIS PROTECTION                            │
│                                              │
│ Reduce Equity      46% → 30%                 │
│ Increase Bonds     24% → 32%                 │
│ Increase Cash      10% → 18%                 │
│                                              │
│ Expected Risk      84 → 31                   │
│ Turnover           16%                       │
│ Estimated Cost     ₹12,500                   │
│                                              │
│ VALIDATOR                                   │
│ ✓ Math                                       │
│ ✓ Risk                                       │
│ ✓ Policy                                     │
│ ✓ Execution                                  │
│                                              │
│ [ APPROVE ]        [ REJECT ]                │
└──────────────────────────────────────────────┘
```

The risk officer should understand the proposed action in **under 10 seconds**.

---

# 34. AI Risk Manager UI

Don't make it a generic ChatGPT clone.

The Copilot should be **contextual**.

Put it beside the active risk event:

```text
┌───────────────────────────────┐
│ AEGIS RISK MANAGER             │
├───────────────────────────────┤
│                                │
│ Why are we in RED?             │
│                                │
│ [answer]                       │
│                                │
│ Evidence                       │
│ • Policy §4.2                  │
│ • Crisis Research §3           │
│                                │
│ ─────────────────────────────  │
│                                │
│ Suggested questions:           │
│                                │
│ Why did risk increase?         │
│ Why this rebalance?            │
│ What happens if we wait?       │
│ What policy requires this?     │
│                                │
│ [ Ask AEGIS... ]               │
└───────────────────────────────┘
```

This is far better than giving the risk manager a blank chatbot.

---

# 35. Audit UI

The audit screen should show:

```text
TIME
REGIME
RISK BEFORE
EVENT
RECOMMENDATION
ACTION
APPROVED BY
RISK AFTER
OUTCOME
```

Example:

```text
10:42   CRISIS   84
Market Crash
Reduce Equity 16%
Approved
Risk → 31
Outcome: monitored
```

---

# 36. Database Model

At minimum:

```text
portfolios
portfolio_holdings
market_prices
market_features
risk_snapshots
regime_snapshots
contagion_clusters
stress_runs
reverse_stress_runs
optimizations
validation_results
recommendations
documents
document_chunks
audit_events
outcomes
```

Important relationship:

```text
Portfolio
   │
   ├── Holdings
   │
   ├── Risk Snapshots
   │
   ├── Stress Runs
   │
   └── Recommendations
           │
           ├── Optimization
           ├── Validation
           ├── Evidence
           └── Approval
                    │
                    └── Outcome
```

---

# 37. API Contract

## Portfolio

```text
GET  /api/portfolio
GET  /api/portfolio/holdings
```

## Risk

```text
GET /api/risk
GET /api/risk/breakdown
```

## Market

```text
GET /api/market/state
GET /api/market/regime
GET /api/market/contagion
```

## Master

```text
GET /api/state/master
```

## Stress

```text
POST /api/stress/forward
POST /api/stress/reverse
GET  /api/stress/{id}
```

## Optimization

```text
POST /api/optimizer/rebalance
GET  /api/optimizer/{id}
```

## Validation

```text
POST /api/validator/validate
```

## Recommendations

```text
GET /api/recommendation/active
GET /api/recommendation/{id}
```

## Copilot

```text
POST /api/risk-manager/chat
```

## Approval

```text
POST /api/rebalance/{id}/approve
POST /api/rebalance/{id}/reject
```

## Audit

```text
GET /api/audit/history
GET /api/audit/outcomes
```

---

# 38. End-to-End Backend Sequence

When market data changes:

```text
1. Ingest market prices
2. Validate data
3. Calculate features
4. Update regime
5. Calculate contagion
6. Calculate portfolio risk
7. Evaluate operating envelope
8. Calculate prediction
9. If safe:
       store state
       no optimizer
10. If breached:
       run stress analysis
       run reverse stress
       optimize
       validate
       retrieve policy evidence
       generate recommendation
11. Store master state
12. Notify frontend
```

---

# 39. Important State Machine

Use an explicit state machine.

```text
SAFE
 │
 │ risk rising
 ▼
WARNING
 │
 │ risk > threshold
 ▼
STRESS
 │
 │ hard breach
 ▼
CRISIS
 │
 ├── optimizer
 │
 ├── validator
 │
 └── human approval
 │
 ▼
PROTECTED
 │
 │ risk returns below exit threshold
 ▼
SAFE
```

This prevents accidental actions from individual AI outputs.

---

# 40. RAG + Prediction + Quant Separation

This is the most important technical boundary.

```text
┌──────────────────────────────────────────────┐
│ QUANTITATIVE TRUTH                           │
│ Python / NumPy / CVXPY                      │
│                                              │
│ risk, VaR, CVaR, volatility, allocation      │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ PREDICTIVE INTELLIGENCE                      │
│ HMM / EWMA / GARCH / classifier              │
│                                              │
│ regime, volatility forecast, breach prob.    │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ KNOWLEDGE TRUTH                              │
│ RAG / pgvector                               │
│                                              │
│ policy, regulation, historical evidence      │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ LANGUAGE / REASONING                         │
│ LLM                                           │
│                                              │
│ explanation, Q&A, recommendation rationale   │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ SAFETY AUTHORITY                             │
│ Validator + Human Risk Officer               │
└──────────────────────────────────────────────┘
```

---

# 41. What We Should NOT Build

For the hackathon, explicitly avoid:

```text
❌ Autonomous trading
❌ LLM-generated risk numbers
❌ LLM deciding portfolio weights
❌ Complex multi-agent architecture
❌ Reinforcement learning
❌ Hundreds of indicators
❌ Live execution through a broker
❌ Huge document corpus
❌ Separate microservices
❌ Overly complex Kubernetes deployment
```

The goal is a **credible working institutional prototype**, not a production trading platform.

---

# 42. Build Sequence

## Milestone 1 — Existing Foundation

```text
✓ Portfolio
✓ Risk
✓ Market Crash
✓ Safe Envelope
✓ CVXPY optimizer
✓ Validator
✓ Approval
```

Keep it stable.

## Milestone 2 — Intelligence

```text
→ Master State
→ Regime AI
→ Contagion
→ Risk attribution
```

## Milestone 3 — Prediction + Failure

```text
→ Volatility forecast
→ Breach probability
→ Forward stress
→ Reverse stress
→ Resilience
```

## Milestone 4 — Institutional Knowledge

```text
→ Policy documents
→ Document ingestion
→ Embeddings
→ pgvector
→ Retrieval
→ Evidence citations
```

## Milestone 5 — AI Risk Manager

```text
→ Tool calling
→ Grounded answers
→ Recommendation explanation
→ Policy citations
→ "What if I delay?"
```

## Milestone 6 — Decision & Learning

```text
→ Approval
→ Audit
→ Outcome tracking
→ Decision history
```

## Milestone 7 — Frontend

```text
→ Risk command center
→ Stress lab
→ Contagion
→ Reverse stress
→ Recommendation
→ Copilot
→ Audit
```

---

# 43. Testing Strategy

Do not only test endpoints.

Test the financial invariants.

## Unit tests

```text
test_var()
test_cvar()
test_drawdown()
test_liquidity()
test_hhi()
test_risk_contribution()
```

## Model tests

```text
test_calm_regime()
test_transition_regime()
test_crisis_regime()
test_volatility_forecast()
test_breach_probability()
```

## Contagion tests

```text
test_normal_correlation()
test_stressed_correlation()
test_cluster_detection()
```

## Stress tests

```text
test_forward_crash()
test_reverse_failure_boundary()
```

## Optimizer

```text
test_budget()
test_long_only()
test_equity_cap()
test_cash_floor()
test_volatility()
test_single_asset_cap()
test_turnover()
```

## RAG

```text
test_document_ingestion()
test_retrieval()
test_citation()
test_no_evidence_response()
```

## Copilot

```text
test_uses_master_state()
test_uses_retrieved_evidence()
test_no_invented_numbers()
test_cannot_approve_trade()
```

## End-to-end

```text
baseline
 → market shock
 → crisis
 → recommendation
 → validation
 → approval
 → updated portfolio
 → outcome
```

The existing 68 tests remain the regression baseline.

---

# 44. Definition of Done

AEGIS is complete for the hackathon when this scenario works without manually manipulating backend state:

```text
1. Load portfolio
2. Show GREEN
3. Ingest/update market data
4. Detect TRANSITION/CRISIS
5. Show risk deterioration
6. Explain risk drivers
7. Show contagion
8. Predict near-term risk/breach probability
9. Run forward stress
10. Run reverse stress
11. Show distance to failure
12. Generate minimum-intervention rebalance
13. Run independent validation
14. Retrieve policy evidence
15. Explain recommendation through Copilot
16. Human approves
17. Portfolio updates
18. Audit record created
19. Outcome can be evaluated
20. Master state refreshes
```

---

# 45. The 30-Second Demo

The entire product should be understandable in this sequence:

```text
GREEN
₹1 Cr portfolio
Risk = 28
      ↓
Market conditions deteriorate
      ↓
Regime = CRISIS
      ↓
Risk = 84
RED
      ↓
"WHY?"
      ↓
Equity concentration
+ correlation contagion
+ volatility
+ liquidity
      ↓
"HOW CLOSE TO FAILURE?"
      ↓
Reverse stress
      ↓
"WHAT SHOULD WE DO?"
      ↓
Minimum intervention
      ↓
"IS IT SAFE?"
      ↓
Validator PASS
      ↓
"WHY?"
      ↓
RAG-backed Copilot explanation
      ↓
Risk Officer APPROVES
      ↓
Risk = 31
      ↓
Audit recorded
```

That is the complete story.

---

# 46. Final Architecture in One Diagram

```text
                         AEGIS
                          │
             ┌────────────┴────────────┐
             │                         │
        OBSERVATION                KNOWLEDGE
             │                         │
     Market + Portfolio          Policies + Research
             │                         │
             ▼                         ▼
       QUANT ENGINE                  RAG
             │                         │
             ▼                         │
        REGIME AI                      │
             │                         │
             ▼                         │
        CONTAGION                      │
             │                         │
             └────────────┬────────────┘
                          ▼
                   RISK MANAGER
                   CONTROL ENGINE
                          │
                   SAFE ENVELOPE
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
         FORWARD STRESS          REVERSE STRESS
              │                       │
              └───────────┬───────────┘
                          ▼
                    OPTIMIZER
                          │
                          ▼
                     VALIDATOR
                          │
                     ┌────┴────┐
                     │         │
                   FAIL       PASS
                     │         │
                   BLOCK       ▼
                          AI COPILOT
                               │
                               ▼
                       HUMAN OFFICER
                               │
                        ┌──────┴──────┐
                        ▼             ▼
                     REJECT        APPROVE
                                      │
                                      ▼
                                  EXECUTION
                                      │
                                      ▼
                                  AUDIT
                                      │
                                      ▼
                                  OUTCOME
                                      │
                                      └──→ LEARNING
```

## The final product philosophy

**AEGIS should make the risk manager's screen answer the decision in this order:**

> **STATUS → CHANGE → CAUSE → IMPACT → FAILURE → ACTION → PROOF → APPROVAL**

Not:

> 30 charts → 50 metrics → chatbot → figure it out yourself.

That ordering is the core UI/UX decision. The system can contain all the underlying information, but the **risk manager's first screen should surface only what changes the decision**, with deeper quantitative detail available one level below.

This also preserves the strongest idea in your original AEGIS concept: don't continuously chase an optimal portfolio; determine whether capital is still inside its safe operating envelope and intervene only as much as necessary. fileciteturn1file0L46-L69
