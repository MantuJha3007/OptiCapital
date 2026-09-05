# AEGIS: Adaptive Capital Resilience & Risk-Control System
## Final Product Specification & Source of Truth

**Version:** 2.0  
**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Authoritative Implementation Blueprint:** [CURRENT_SYSTEM_ARCHITECTURE.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/CURRENT_SYSTEM_ARCHITECTURE.md)  
**Status:** Canonical Master Specification  
**Operational Scope:** Simulation & Decision-Support System (Non-Execution)  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Final Solution: Closed-Loop Capital Control](#3-final-solution-closed-loop-capital-control)
4. [Product Goals & Design Principles](#4-product-goals--design-principles)
5. [User Persona](#5-user-persona)
6. [System Architecture](#6-system-architecture)
7. [Component Responsibilities](#7-component-responsibilities)
8. [End-to-End Data & Decision Flow](#8-end-to-end-data--decision-flow)
9. [Risk Engine](#9-risk-engine)
10. [Risk Attribution](#10-risk-attribution)
11. [Safe Operating Envelope (SOE)](#11-safe-operating-envelope-soe)
12. [Hysteresis & Anti-Chattering Control](#12-hysteresis--anti-chattering-control)
13. [Control Engine](#13-control-engine)
14. [Scenario Engine](#14-scenario-engine)
15. [Forward Stress Testing Flow](#15-forward-stress-testing-flow)
16. [Reverse Stress Testing & Failure Boundary Analysis](#16-reverse-stress-testing--failure-boundary-analysis)
17. [Distance to Failure & Resilience Metrics](#17-distance-to-failure--resilience-metrics)
18. [CVXPY Optimizer](#18-cvxpy-optimizer)
19. [Minimum-Intervention Objective](#19-minimum-intervention-objective)
20. [Transaction Cost Engine](#20-transaction-cost-engine)
21. [Independent Candidate Validator](#21-independent-candidate-validator)
22. [Human Approval Workflow](#22-human-approval-workflow)
23. [Simulated Rebalance & State Update](#23-simulated-rebalance--state-update)
24. [PostgreSQL Audit Trail](#24-postgresql-audit-trail)
25. [Explainability & AI Layer](#25-explainability--ai-layer)
26. [Frontend Architecture](#26-frontend-architecture)
27. [Backend Architecture](#27-backend-architecture)
28. [Database Architecture](#28-database-architecture)
29. [API Architecture & Contracts](#29-api-architecture--contracts)
30. [Error Handling & Infeasibility Fallbacks](#30-error-handling--infeasibility-fallbacks)
31. [Security, Safety, & Operational Boundaries](#31-security-safety--operational-boundaries)
32. [Testing & Financial Invariants](#32-testing--financial-invariants)
33. [Hackathon Demo Storyboard](#33-hackathon-demo-storyboard)
34. [Feature Priorities & Future Extensions](#34-feature-priorities--future-extensions)

---

## 1. Product Overview

**AEGIS** (Adaptive Capital Resilience & Risk-Control System) is a closed-loop financial risk governance and supervisory decision-support system. It continuously evaluates institutional multi-asset portfolios against a dynamically parameterized **Safe Operating Envelope (SOE)**.

When market volatility, correlation spikes, or external macroeconomic shocks push a portfolio outside its acceptable risk boundary, AEGIS does not attempt an unconstrained, turnover-heavy re-allocation. Instead, it:
1. **Diagnoses the root cause** of the risk surge through granular risk attribution.
2. **Determines whether intervention is strictly mandatory** using state hysteresis to prevent trading chatter.
3. **Formulates the minimum necessary intervention** via convex optimization (CVXPY) that restores the portfolio safely within limits while penalizing portfolio turnover and transaction friction.
4. **Independently validates** the candidate weights against hard risk and liquidity bounds before human presentation.
5. **Stress-tests resilience** and calculates the portfolio's **distance to failure** through reverse stress testing.
6. **Persists an immutable, auditable decision event** in PostgreSQL.

> *"Don't continuously chase an unconstrained optimal portfolio. Keep capital resilient—and know how it can fail before it does."*

---

## 2. Problem Statement

### The Flaws of Traditional Portfolio Optimization
In institutional finance, traditional portfolio optimization (e.g., standard Mean-Variance Optimization) treats allocation as an open-loop mathematical calculation:
- **Over-sensitivity to Estimation Error:** Slight changes in expected return vectors produce radical, unstable shifts in asset allocations.
- **Unnecessary Churn & Transaction Friction:** Chasing optimal points at every time step generates massive turnover, destroying capital via brokerage, slippage, and spread costs.
- **Fragility Under Regime Shifts:** Models assume static normal distributions and constant correlation matrices. When a crisis hits, asset correlations converge toward 1.0, destroying diversification precisely when needed.
- **Lack of Defensive Self-Regulation:** Standard optimizers do not evaluate whether an intervention is actually worth executing given current risk buffers.

### The Problem Reframed
AEGIS reframes the question:
- **Traditional:** *"What is the globally optimal asset allocation right now?"*
- **AEGIS:** *"Is current capital operating safely within its resilience envelope? If not, what is the smallest feasible adjustment required to restore safety?"*

---

## 3. Final Solution: Closed-Loop Capital Control

AEGIS applies classic cybernetic closed-loop control theory to capital preservation:

```text
       ┌────────────────────────────────────────────────────────┐
       │                                                        │
       ▼                                                        │
[PORTFOLIO STATE] ──► [RISK ENGINE] ──► [RISK ATTRIBUTION]      │
                             │                                  │
                             ▼                                  │
                  [SAFE OPERATING ENVELOPE]                     │
                             │                                  │
                             ▼                                  │
                     [CONTROL ENGINE]                           │
                             │                                  │
                             ▼                                  │
                 [MIN-INTERVENTION OPTIMIZER]                   │
                             │                                  │
                             ▼                                  │
                    [TRANSACTION COST]                          │
                             │                                  │
                             ▼                                  │
                  [INDEPENDENT VALIDATOR] ──► [FAIL: BLOCK]     │
                             │                                  │
                             ▼ (PASS)                           │
                     [HUMAN APPROVAL] ──► [REJECT: AUDIT LOG]   │
                             │                                  │
                             ▼ (APPROVED)                       │
                   [SIMULATED REBALANCE]                        │
                             │                                  │
                             ▼                                  │
                  [REVERSE STRESS RE-TEST]                      │
                             │                                  │
                             ▼                                  │
                    [POSTGRESQL AUDIT] ─────────────────────────┘
```

The control system exhibits five distinguishing properties:
1. **Proportional Defensive Response:** Interventions scale proportionally with envelope breach severity.
2. **Minimum Turnover:** Portfolio weights are nudged only enough to satisfy boundary conditions.
3. **Dual Verification:** The entity proposing adjustments (Optimizer) cannot certify compliance (Validator).
4. **Resilience Awareness:** Evaluates distance to catastrophic failure boundaries rather than just historical standard deviations.
5. **Strict Determinism:** Financial calculations are governed by pure mathematical models; AI is utilized exclusively for natural language explanation.

---

## 4. Product Goals & Design Principles

### Goals
- **Capital Preservation:** Prevent unmonitored accumulation of tail risk, drawdown, and illiquidity.
- **Operational Cost Efficiency:** Eliminate portfolio churning through minimum-intervention mechanics.
- **Regulatory & Audit Readiness:** Maintain 100% auditable traceability of every metric, alert, proposal, and human decision.
- **High-Velocity Decision Support:** Enable a risk officer to assess, simulate, and resolve a portfolio crisis in under 60 seconds.

### Design Principles
1. **Resilience Over Optimality:** A resilient sub-optimal portfolio survives crises that bankrupt theoretically "optimal" portfolios.
2. **Separation of Concerns:** Separate detection (Risk Engine), decision-making (Control Engine), mathematical generation (Optimizer), and certification (Validator).
3. **Hysteresis by Default:** Never trigger defensive actions on transient noise.
4. **Honest Explainability:** Never allow black-box hallucinations to recommend capital allocations.

---

## 5. User Persona

### Primary Persona: Institutional Risk Officer / Capital Controller
- **Context:** Responsible for managing institutional capital (family office, treasury, pension fund, multi-asset hedge fund).
- **Core Jobs-to-be-Done:**
  - Continuously verify that active portfolios comply with mandate risk limits.
  - Identify concentration clusters and hidden contagion before markets open.
  - Evaluate what-if macroeconomic shocks (stagflation, credit freeze, flash crash).
  - Review, modify, or approve defensive rebalance recommendations.
  - Provide auditors and investment committees with complete decision logs.

---

## 6. System Architecture

AEGIS is built as a cloud-native, modular service architecture:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│                 React 18 + TypeScript + Vite + Tailwind                │
│       Dashboard · Risk Attribution · Stress Lab · Audit History        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JSON / REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                           API GATEWAY LAYER                            │
│                           FastAPI Router                               │
│       /portfolio · /risk · /scenarios · /optimize · /rebalance         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         CORE SERVICE ENGINES                           │
│  ┌────────────────────────┐                  ┌──────────────────────┐  │
│  │      Risk Engine       │                  │    Scenario Engine   │  │
│  │ (Vol, DD, HHI, Stress) │                  │ (Forward / Reverse)  │  │
│  └───────────┬────────────┘                  └──────────┬───────────┘  │
│              │                                          │              │
│              ▼                                          ▼              │
│  ┌────────────────────────┐                  ┌──────────────────────┐  │
│  │ Safe Operating Envelope│                  │  Risk Attribution    │  │
│  │  (GREEN/YELLOW/RED)    │                  │  (Asset Risk Contrib)│  │
│  └───────────┬────────────┘                  └──────────────────────┘  │
│              │                                                         │
│              ▼                                                         │
│  ┌────────────────────────┐                  ┌──────────────────────┐  │
│  │     Control Engine     │                  │  Independent         │  │
│  │  (Dynamic Constraints) │                  │  Validator           │  │
│  └───────────┬────────────┘                  └──────────▲───────────┘  │
│              │                                          │              │
│              ▼                                          │ (Verify)     │
│  ┌────────────────────────┐                             │              │
│  │  CVXPY Min-Intervention│─────────────────────────────┘              │
│  │       Optimizer        │                                            │
│  └───────────┬────────────┘                                            │
│              │                                                         │
│              ▼                                                         │
│  ┌────────────────────────┐                  ┌──────────────────────┐  │
│  │   Transaction Cost     │                  │  AI Explanation      │  │
│  │     Calculator         │                  │      Service         │  │
│  └────────────────────────┘                  └──────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                            DATA LAYER                                  │
│                 SQLAlchemy 2.0 ORM + PostgreSQL 16                     │
│    Portfolios · Holdings · Snapshots · Scenarios · Audits · Alerts     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Component Responsibilities

| Component | Repository Path | Core Responsibility |
| :--- | :--- | :--- |
| **Risk Engine** | `backend/app/services/risk_engine.py` | Computes portfolio statistical metrics (volatility, drawdown, HHI, liquidity) and composite risk score. |
| **Risk Attribution** | `backend/app/services/risk_attribution.py` | Quantifies asset-level marginal risk contributions ($MCAR_i$) to answer *why* risk increased. |
| **Control Engine** | `backend/app/services/control_engine.py` | Evaluates current risk against envelope thresholds, detects breaches, and issues dynamic optimization bounds. |
| **Optimizer** | `backend/app/services/optimizer.py` | Executes convex quadratic programming using CVXPY to compute minimum-turnover candidate weights. |
| **Validator** | `backend/app/services/validator.py` | Independently evaluates candidate weights against hard safety, concentration, and liquidity invariants. |
| **Scenario Engine** | `backend/app/services/scenario_engine.py` | Applies synthetic or historical shocks across asset classes to assess stressed portfolio behavior. |
| **Reverse Stress Engine** | `backend/app/services/reverse_stress.py` | Performs deterministic shock sweeps to calculate the failure boundary and distance to failure. |
| **Rebalance Service** | `backend/app/services/rebalancer.py` | Handles human approval and executes simulated holding updates in PostgreSQL with audit trails. |
| **Explanation Service** | `backend/app/services/explanation_service.py` | Generates deterministic, human-readable rationales summarizing breaches, turnover, and risk reduction. |
| **Market Data Service** | `backend/app/services/market_data_service.py` | Manages historical price histories, log returns, and annualized covariance matrices. |
| **Portfolio Service** | `backend/app/services/portfolio_service.py` | Retrieves and maintains portfolio states, cash balances, and holding valuations. |

---

## 8. End-to-End Data & Decision Flow

The canonical execution flow across AEGIS proceeds in 14 discrete stages:

```text
[Stage 1: Portfolio Ingestion]
  Portfolio assets, current holdings (w_0), and historical price matrices are loaded.
       │
       ▼
[Stage 2: Risk Quantification]
  Portfolio volatility (σ_p), Maximum Drawdown (MDD), Liquidity Ratio (L), 
  Concentration (HHI), and Market Stress Indicator (S) are computed.
       │
       ▼
[Stage 3: Risk Attribution]
  Marginal contribution to risk (MCAR_i) and percentage risk contribution are calculated.
       │
       ▼
[Stage 4: Safe Operating Envelope Evaluation]
  Risk Score (0–100) is evaluated against SOE zones: GREEN, YELLOW, ORANGE, RED.
       │
       ▼
[Stage 5: Shock Execution (Forward Stress)]
  User initiates scenario shock ΔP. Stressed asset prices and portfolio loss are calculated.
       │
       ▼
[Stage 6: Post-Shock Re-assessment]
  Stressed weights (w_shock) and post-shock risk metrics are derived.
       │
       ▼
[Stage 7: Control Engine & Breach Detection]
  Envelope boundary breaches trigger alert generation and dynamic constraint derivation.
       │
       ▼
[Stage 8: Minimum-Intervention Optimization]
  CVXPY solves: min ||w - w_shock||² + γ * Turnover(w, w_shock) + λ * w^T Σ w
  Subject to: Dynamic Volatility, Asset Bounds, and Cash Floors.
       │
       ▼
[Stage 9: Transaction Cost Quantification]
  Transaction friction C_txn = Turnover * Portfolio_Value * Cost_Rate is evaluated.
       │
       ▼
[Stage 10: Independent Validation]
  Candidate weights w* are evaluated by Validator. If any limit fails → BLOCKED.
       │
       ▼
[Stage 11: Human-in-the-Loop Review]
  Officer reviews Candidate Allocation, Before/After Risk Delta, Cost, and Rationale.
       │
       ▼
[Stage 12: Simulated Execution]
  Upon user click [APPROVE REBALANCE], database holdings update to w*.
       │
       ▼
[Stage 13: Stress Re-test & Reverse Stress]
  Post-rebalance portfolio is re-tested under original shock and reverse shock sweep.
       │
       ▼
[Stage 14: Comprehensive Audit Persistence]
  Every metric, alert, optimization run, validation check, and user action is written to PostgreSQL.
```

---

## 9. Risk Engine

The Risk Engine measures multi-dimensional portfolio vulnerability using six core metrics:

### 9.1 Mathematical Formulations

#### Expected Return
$$E[R_p] = w^T \mu$$
where $w$ is the weight vector ($\sum w_i = 1$) and $\mu$ is the annualized asset return vector.

#### Annualized Portfolio Volatility
$$\sigma_p = \sqrt{w^T \Sigma w}$$
where $\Sigma$ is the annualized asset return covariance matrix:
$$\Sigma = 252 \times \Sigma_{\text{daily}}$$

#### Maximum Drawdown (MDD)
$$\text{MDD} = \max_{t \in [0, T]} \left( \frac{\text{Peak}_t - V_t}{\text{Peak}_t} \right)$$
where $V_t$ is portfolio value at time $t$ and $\text{Peak}_t = \max_{s \le t} V_s$.

#### Liquidity Ratio ($L$)
$$L = \sum_{i=1}^N w_i \cdot \ell_i$$
where $\ell_i \in [0, 1]$ represents the normalized liquidity score of asset $i$ (Cash = 1.0, Equity = 0.90, Corp Bonds = 0.70).

#### Concentration Index (Herfindahl-Hirschman Index - HHI)
$$\text{HHI} = \sum_{i=1}^N w_i^2$$
For a perfectly balanced 5-asset portfolio, $\text{HHI} = 0.20$. For complete concentration in 1 asset, $\text{HHI} = 1.00$.

#### Market Stress Indicator ($S$)
$$S = \min\left(\max\left(\frac{\sigma_{\text{current}}}{\sigma_{\text{historical\_avg}}} - 1.0, 0.0\right), 1.0\right)$$

### 9.2 Composite Risk Score (0–100)
The risk score synthesizes individual normalized factors using institutional risk weightings:

$$\text{Risk Score} = 0.30 \cdot S_{\text{vol}} + 0.25 \cdot S_{\text{dd}} + 0.20 \cdot S_{\text{conc}} + 0.15 \cdot S_{\text{liq}} + 0.10 \cdot S_{\text{stress}}$$

Where:
- $S_{\text{vol}} = \min(\sigma_p / 0.30, 1.0) \times 100$
- $S_{\text{dd}} = \min(\text{MDD} / 0.20, 1.0) \times 100$
- $S_{\text{conc}} = \max\left(\frac{\text{HHI} - 0.20}{0.80}, 0.0\right) \times 100$
- $S_{\text{liq}} = (1.0 - L) \times 100$
- $S_{\text{stress}} = S \times 100$

---

## 10. Risk Attribution

Risk attribution answers the fundamental question: **"Why is the portfolio risky?"**

### 10.1 Marginal Contribution to Risk (MCR)
The marginal contribution of asset $i$ to total portfolio volatility is the partial derivative:

$$\text{MCR}_i = \frac{\partial \sigma_p}{\partial w_i} = \frac{(\Sigma w)_i}{\sigma_p}$$

### 10.2 Absolute Risk Contribution (ARC)
$$\text{ARC}_i = w_i \cdot \text{MCR}_i = \frac{w_i (\Sigma w)_i}{\sigma_p}$$

Euler's decomposition confirms that the sum of absolute risk contributions equals total portfolio volatility:
$$\sum_{i=1}^N \text{ARC}_i = \sigma_p$$

### 10.3 Percentage Risk Contribution (PRC)
$$\text{PRC}_i = \frac{\text{ARC}_i}{\sigma_p} = \frac{w_i (\Sigma w)_i}{\sigma_p^2}$$

A portfolio may appear balanced by capital weight (e.g., 40% Equity, 60% Bonds), but Equity may account for **88% of total portfolio risk**. AEGIS surfaces this hidden concentration.

---

## 11. Safe Operating Envelope (SOE)

AEGIS partitions the continuous state space into four operating regimes:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      SAFE OPERATING ENVELOPE (SOE)                     │
│                                                                        │
│   [GREEN: Normal]  ────►  Score: 0 – 29                                │
│                           Status: Fully compliant                      │
│                           Action: Monitor; suppress unnecessary trades │
│                                                                        │
│   [YELLOW: Caution] ───►  Score: 30 – 59                               │
│                           Status: Approaching boundary                 │
│                           Action: Tighten risk budget; alert officer   │
│                                                                        │
│   [ORANGE: Warning] ───►  Score: 60 – 79                               │
│                           Status: Boundary breach                      │
│                           Action: Formulate defensive proposal         │
│                                                                        │
│   [RED: Critical]   ───►  Score: 80 – 100                              │
│                           Status: Severe failure condition             │
│                           Action: Mandatory minimum-intervention       │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.1 Dynamic Constraint Parameter Table

| Parameter | GREEN (Safe) | YELLOW (Caution) | ORANGE (Warning) | RED (Crisis) |
| :--- | :--- | :--- | :--- | :--- |
| **Max Equity Exposure** | 50.0% | 45.0% | 35.0% | 20.0% |
| **Min Cash Reserve** | 5.0% | 10.0% | 15.0% | 20.0% |
| **Max Portfolio Volatility** | 15.0% | 14.0% | 12.0% | 10.0% |
| **Max Drawdown Limit** | 10.0% | 10.0% | 8.0% | 5.0% |
| **Intervention Trigger** | None | Advisory Alert | Candidate Generated | Mandatory Action |

---

## 12. Hysteresis & Anti-Chattering Control

A primary failure mode of naive threshold systems is **boundary chattering**: when a portfolio score hovers around 30 or 60, small intraday price ticks cause continuous rebalance recommendations.

AEGIS implements asymmetric hysteresis bands ($\delta = 3.0$ points):

```text
Escalation Threshold (Breach):      Score ≥ Boundary_Threshold
De-escalation Threshold (Recovery):   Score ≤ Boundary_Threshold - δ
```

### Transition Logic
- Transition from **GREEN → YELLOW** occurs at **Risk Score ≥ 30.0**.
- Return from **YELLOW → GREEN** requires **Risk Score ≤ 27.0**.
- Transition from **YELLOW → ORANGE** occurs at **Risk Score ≥ 60.0**.
- Return from **ORANGE → YELLOW** requires **Risk Score ≤ 57.0**.
- Transition from **ORANGE → RED** occurs at **Risk Score ≥ 80.0**.
- Return from **RED → ORANGE** requires **Risk Score ≤ 77.0**.

This simple, deterministic rule eliminates portfolio churning while ensuring rapid defensive escalation when genuine stress emerges.

---

## 13. Control Engine

The Control Engine acts as the governor connecting Risk Assessment to Optimization:
1. **Breach Extraction:** Compares current risk metrics ($\sigma_p, \text{MDD}, L, \text{HHI}$) against the baseline normal envelope.
2. **Alert Generation:** Creates structured alert payloads for every violated threshold.
3. **Dynamic Parameter Formulation:** Selects the corresponding constraint vector from the SOE table to parameterize the optimizer.
4. **Action Categorization:** Classifies recommended operational stance into:
   - `HOLD`: Risk score is GREEN, zero hard breaches.
   - `REBALANCE`: Risk score is YELLOW/ORANGE, or single metric breach detected.
   - `CRISIS_PROTECTION`: Risk score is RED, multiple severe breaches detected.

---

## 14. Scenario Engine

The Scenario Engine simulates macroeconomic stress events by applying asset-level shocks:

### Seeded Scenarios
1. **Normal Market:** Small baseline movements (Equity +2%, Gov Bonds +1%, Corp Bonds +1%, Gold +1%, Cash 0%).
2. **Market Crash:** Severe equity sell-off with flight to safety (Equity -30%, Gov Bonds -5%, Corp Bonds -10%, Gold +12%, Cash 0%).
3. **Stagflation / High Inflation:** Rate hikes and equity drop (Equity -15%, Gov Bonds -12%, Corp Bonds -8%, Gold +15%, Cash 0%).

### Shock Calculation
For each asset $i$ with shock percentage $s_i$:
$$V_i^{\text{shocked}} = V_i^0 \cdot (1 + s_i) = w_i^0 \cdot V_{\text{total}}^0 \cdot (1 + s_i)$$
$$V_{\text{total}}^{\text{shocked}} = \sum_{i=1}^N V_i^{\text{shocked}}$$
$$w_i^{\text{shocked}} = \frac{V_i^{\text{shocked}}}{V_{\text{total}}^{\text{shocked}}}$$

---

## 15. Forward Stress Testing Flow

Forward stress testing computes the deterministic outcome of a **known, specified shock**:
1. Take current portfolio state $w^0, V^0$.
2. Apply shock vector $s$.
3. Compute shocked portfolio valuation $V^{\text{shocked}}$ and portfolio loss percentage.
4. Derive post-shock weights $w^{\text{shocked}}$.
5. Re-run Risk Engine on $w^{\text{shocked}}$.
6. Present post-shock risk metrics to the dashboard.

---

## 16. Reverse Stress Testing & Failure Boundary Analysis

Reverse stress testing is the **primary distinguishing feature of AEGIS**.

### 16.1 Conceptual Difference
- **Forward Stress:** *"What happens to our capital if Equity drops 30%?"*
- **Reverse Stress:** *"What is the minimum market shock that would cause our portfolio to breach its failure boundary (e.g., Drawdown > 15% or Risk Score > 80)?"*

### 16.2 Deterministic Shock Sweep Algorithm
To maintain 100% predictability and sub-second latency for hackathon judging, AEGIS executes a deterministic shock sweep:

```python
def calculate_failure_boundary(portfolio, failure_threshold_score=80.0):
    """
    Sweeps shock intensity α from 0% to 50% in steps of 2%.
    For each step, applies composite crash vector and calculates post-shock score.
    Finds the exact critical shock α* where Risk Score >= failure_threshold_score.
    """
    shock_vector = {"EQUITY": -1.0, "CORP_BONDS": -0.3, "GOV_BONDS": -0.1, "GOLD": +0.4, "CASH": 0.0}
    
    for alpha in np.arange(0.02, 0.52, 0.02):
        scaled_shocks = {k: v * alpha for k, v in shock_vector.items()}
        post_shock_risk = simulate_shock(portfolio, scaled_shocks)
        if post_shock_risk.risk_score >= failure_threshold_score:
            return {
                "critical_shock_alpha": alpha,
                "failure_score": post_shock_risk.risk_score,
                "status": "VULNERABLE",
                "distance_to_failure": alpha
            }
    return {"status": "RESILIENT", "distance_to_failure": 0.50}
```

---

## 17. Distance to Failure & Resilience Metrics

AEGIS defines two quantitative resilience indicators:

### 17.1 Distance to Failure (DtF)
$$\text{DtF} = \alpha^*$$
where $\alpha^*$ is the multiplier of standard crisis shocks required to breach the RED operating boundary.
- **DtF < 10%:** High Fragility (Immediate defensive action required).
- **10% ≤ DtF ≤ 25%:** Moderate Resilience.
- **DtF > 25%:** Robust Resilience.

### 17.2 Resilience Score
$$\text{Resilience Score} = \min\left(\frac{\text{DtF}}{0.30}, 1.0\right) \times 100$$
Provides an intuitive 0–100 health gauge demonstrating how much buffer exists before capital preservation fails.

---

## 18. CVXPY Optimizer

The CVXPY Optimizer solves a convex optimization problem parameterized by the Control Engine.

### 18.1 Mathematical Program

$$\min_{w} \quad \underbrace{\frac{1}{2} \|w - w_{\text{current}}\|_2^2}_{\text{Minimum Intervention}} + \underbrace{\gamma \cdot \|w - w_{\text{current}}\|_1}_{\text{Turnover Penalty}} + \underbrace{\lambda \cdot w^T \Sigma w}_{\text{Residual Variance}} - \underbrace{\kappa \cdot w^T \mu}_{\text{Return Incentive}}$$

Subject to the convex constraints:
1. **Fully Invested Budget:**
   $$\sum_{i=1}^N w_i = 1.0$$
2. **No Short-Selling (Long-Only):**
   $$w_i \ge 0 \quad \forall i$$
3. **Dynamic Asset Upper Bounds:**
   $$w_{\text{equity}} \le \text{MaxEquity}_{\text{mode}}$$
4. **Dynamic Cash Floor:**
   $$w_{\text{cash}} \ge \text{MinCash}_{\text{mode}}$$
5. **Asset-Specific Bounds:**
   $$w_i^{\min} \le w_i \le w_i^{\max} \quad \forall i$$
6. **Portfolio Volatility Limit:**
   $$w^T \Sigma w \le \sigma_{\max,\text{mode}}^2$$

### 18.2 Solver Selection
The problem is formulated as a Quadratic Program (QP) or Second-Order Cone Program (SOCP) and solved via **CLARABEL**, **OSQP**, or **SCS** solvers supported natively by CVXPY.

---

## 19. Minimum-Intervention Objective

The minimum-intervention philosophy is central to AEGIS:
- Rather than discarding the existing portfolio to achieve an unconstrained theoretical optimum, the objective function explicitly minimizes the squared $L_2$ Euclidean distance $\|w - w_{\text{current}}\|_2^2$.
- The $L_1$ turnover term $\sum |w_i - w_{\text{current},i}|$ directly penalizes trading friction.
- Result: **The solver nudges weights only just enough to satisfy the safety constraints of the envelope.**

---

## 20. Transaction Cost Engine

Transaction costs are explicitly calculated and deducted from capital evaluations:

$$\text{Turnover} = \sum_{i=1}^N |w_i^* - w_i^{\text{current}}|$$
$$C_{\text{txn}} = \text{Turnover} \times V_{\text{portfolio}} \times r_{\text{cost}}$$

Where $r_{\text{cost}}$ is the institutional transaction cost rate (default = 10 bps / 0.0010).

---

## 21. Independent Candidate Validator

To eliminate conflict of interest and guard against solver numerical inaccuracy, candidate allocations produced by the optimizer must pass an **independent validator** before being shown to the user.

```text
[Candidate Allocation w*]
            │
            ▼
┌──────────────────────────────────────┐
│       INDEPENDENT VALIDATOR          │
│                                      │
│  [Check 1] Sum of weights == 1.00000 │
│  [Check 2] All w_i >= 0.0000         │
│  [Check 3] Max equity <= Limit       │
│  [Check 4] Min cash >= Limit         │
│  [Check 5] Asset min/max bounds      │
│  [Check 6] Volatility <= Vol_Limit   │
│  [Check 7] Max single-asset <= 50%   │
└──────────────────┬───────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼ (All Pass)        ▼ (Any Fail)
      [PASS]              [BLOCKED]
(Sent to Officer)   (Fall Back to Safe Mode)
```

If any check fails:
- Recommendation is marked `BLOCKED`.
- System triggers a fallback to the **Deterministic Cash Sweep** (reducing equity to safety limit and allocating the difference to Cash).

---

## 22. Human Approval Workflow

AEGIS enforces a strict **Human-in-the-Loop (HITL)** governance architecture:
- No autonomous live execution.
- The system presents a structured recommendation card:
  - Proposed Allocation ($w^*$) vs Current Allocation ($w^0$).
  - Estimated Transaction Cost ($C_{\text{txn}}$).
  - Portfolio Turnover.
  - Anticipated Risk Score reduction (e.g., 84.2 RED $\to$ 26.5 GREEN).
  - Natural language explanation of changes.
- The Risk Officer must explicitly click **[APPROVE REBALANCE]** or **[REJECT]**.

---

## 23. Simulated Rebalance & State Update

When a rebalance is approved:
1. Active holdings in `holdings` table are updated to reflect $w^*$.
2. Rebalance record in `rebalance_actions` is updated: `approved = TRUE`.
3. Portfolio `updated_at` timestamp is updated.
4. System recalculates post-rebalance risk and re-tests against scenarios.

---

## 24. PostgreSQL Audit Trail

Every state change in AEGIS is stored in PostgreSQL for governance and compliance:
- **`risk_snapshots`**: Records every computed score, vol, drawdown, and liquidity metric.
- **`optimization_runs`**: Records solver status, input risk level, expected return before/after, and transaction cost.
- **`optimization_allocations`**: Records individual per-asset old vs new weights.
- **`rebalance_actions`**: Records recommendations, approval status, user action, and full textual reasoning.
- **`alerts`**: Records threshold breach events.

---

## 25. Explainability & AI Layer

### 25.1 The Safety Boundary Rule
> **Deterministic calculations remain the sole source of truth.**  
> AI (LLMs) must **never** invent asset weights, modify numerical outputs, calculate risk scores, or authorize trades.

### 25.2 Architecture of Explanation
```text
[Deterministic Engines] 
(Risk, Optimizer, Validator, Stress)
         │
         ▼
[Structured Numerical Summary (JSON)]
         │
         ▼
[Explanation Service / AI Layer]
         │
         ▼
[Synthesized Executive Rationale]
```

---

## 26. Frontend Architecture

- **Framework:** React 18 with TypeScript, bundled with Vite.
- **Styling:** Vanilla CSS design tokens integrated with modern Tailwind CSS v4.
- **Visualizations:** Recharts (RadialBar gauges, Pie donut charts, before/after metric bar charts).
- **Icons:** Lucide-React.
- **Primary Views:**
  1. **Executive Dashboard:** Portfolio capital, SOE status badge, risk gauge, current allocation donut.
  2. **Stress Lab:** Scenario selector, shock preview, run simulation trigger.
  3. **Intervention Center:** Candidate allocation diff, cost summary, validator checkmarks, approval action.
  4. **Resilience & Reverse Stress:** Distance-to-failure sweep chart, resilience score.
  5. **Audit History:** Chronological table of persisted decisions.

---

## 27. Backend Architecture

- **Framework:** FastAPI (Python 3.11+).
- **ORM:** SQLAlchemy 2.0 with PostgreSQL 16.
- **Mathematical Computation:** NumPy, SciPy, Pandas.
- **Convex Solver:** CVXPY (CLARABEL / OSQP / SCS).
- **Design Pattern:** Layered Service Pattern:
  - `app/api/`: HTTP endpoints & schema serialization.
  - `app/services/`: Pure business logic & financial engines.
  - `app/models/`: SQLAlchemy ORM database definitions.
  - `app/schemas/`: Pydantic validation contracts.
  - `app/core/`: Mathematical formulas and constant definitions.

---

## 28. Database Architecture

The PostgreSQL schema comprises 11 core tables:
1. `assets`: Master asset registry (symbol, name, category, vol, liquidity score).
2. `portfolios`: Portfolio registry (name, total capital, risk aversion).
3. `holdings`: Current weights and market values.
4. `market_prices`: Historical daily OHLC prices.
5. `risk_snapshots`: Point-in-time risk engine calculations.
6. `optimization_runs`: Solver run metadata and return/vol deltas.
7. `optimization_allocations`: Per-asset weight allocations per run.
8. `scenarios`: Scenario definitions.
9. `scenario_shocks`: Asset-specific shock percentages.
10. `alerts`: Threshold breach log.
11. `rebalance_actions`: Rebalance recommendations and approval records.

---

## 29. API Architecture & Contracts

### Endpoints Overview

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service and database liveness check. |
| `GET` | `/api/portfolio` | Retrieve active portfolio and holding details. |
| `GET` | `/api/risk` | Calculate active portfolio risk score and metrics. |
| `GET` | `/api/risk/attribution` | Calculate asset-level marginal risk contributions. |
| `GET` | `/api/scenarios` | List all predefined stress scenarios and shocks. |
| `POST` | `/api/scenarios/run` | Execute forward scenario simulation. |
| `POST` | `/api/stress/reverse` | Execute reverse stress sweep and compute distance to failure. |
| `POST` | `/api/optimize` | Run standalone minimum-intervention optimization. |
| `POST` | `/api/validate` | Independently validate a candidate allocation. |
| `POST` | `/api/rebalance` | Approve or reject candidate rebalance recommendation. |
| `GET` | `/api/rebalance/history`| Retrieve chronological audit trail of rebalance events. |

---

## 30. Error Handling & Infeasibility Fallbacks

If CVXPY returns `status == "infeasible"` due to overly restrictive constraints during an unprecedented shock:
1. **Fallback Solver:** Retry with relaxed boundary constraints.
2. **Deterministic Cash Rule:** If solver remains infeasible, calculate the exact weight delta required to cap Equity at its mode limit, and shift the balance into Cash.
3. **Audit Log:** Flag optimization run status as `FEASIBLE_FALLBACK` and inform the user.

---

## 31. Security, Safety, & Operational Boundaries

- **Strict Simulation Disclaimer:** AEGIS is an institutional simulation and risk intelligence platform. It has no integration with live broker APIs or exchange execution gateways.
- **Idempotency:** Seed scripts and scenario executions are idempotent.
- **Input Sanitization:** All payload inputs are validated using Pydantic v2 schemas.

---

## 32. Testing & Financial Invariants

Testing validates core financial invariants:
- **Invariant 1:** Budget constraint $\sum w_i = 1.0 \pm 10^{-5}$.
- **Invariant 2:** No-shorting constraint $w_i \ge 0$.
- **Invariant 3:** Post-rebalance volatility $\sigma_{\text{after}} \le \sigma_{\text{before}}$ under crisis conditions.
- **Invariant 4:** Turnover $T \ge 0$ and transaction cost $C_{\text{txn}} \ge 0$.
- **Invariant 5:** Risk score is bounded strictly within $[0, 100]$.

---

## 33. Hackathon Demo Storyboard

A tight, impactful 3-minute presentation flow:
1. **The Healthy State (30s):** Show Dashboard. Capital is ₹1.00 Cr, Risk Score is 24.2 (**GREEN**), portfolio is diversified.
2. **The Shock (45s):** Select **Market Crash** (-30% Equity). Click **RUN SIMULATION**. Score spikes to 84.6 (**RED**). Show threshold breaches.
3. **The Diagnosis (30s):** Open Risk Attribution. Show that Equity accounts for 91% of stressed risk despite being only 38% of capital.
4. **The Safe Control (45s):** Show Minimum-Intervention proposal. Equity trimmed to 20%, Cash raised to 20%. Turnover is minimal, transaction cost is just ₹3,500. Show Independent Validator **PASS**.
5. **The Resolution & Reverse Stress (30s):** Click **[APPROVE REBALANCE]**. Score drops to 26.1 (**GREEN**). Run Reverse Stress Test to show that distance to failure expanded from 8% to 28%.

---

## 34. Feature Priorities & Future Extensions

### Priority Matrix
- **Must Work (P0):** Portfolio State, Risk Engine, Safe Operating Envelope, Control Engine, Minimum-Intervention CVXPY, Transaction Cost, Validator, Simulated Rebalance, Audit Trail.
- **High Value (P1):** Risk Attribution, Reverse Stress Testing, Decision Explanation.
- **Optional Extensions (P2):** Regime Awareness (Hidden Markov Model), Correlation Contagion Matrix, Hierarchical Risk Parity (HRP) comparison, LLM API narrative integration.
