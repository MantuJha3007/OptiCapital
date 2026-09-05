# AEGIS Architecture Overview

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Detailed Technical Specification:** See [AEGIS_TECHNICAL_ARCHITECTURE.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_TECHNICAL_ARCHITECTURE.md)  
**Master Product Specification:** See [AEGIS_FINAL_PRODUCT_SPECIFICATION.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_FINAL_PRODUCT_SPECIFICATION.md)  

---

## 1. System Overview

AEGIS follows a robust layered service architecture built on modern Python and TypeScript technologies:
- **Presentation Layer:** React 18 + TypeScript + Vite + Tailwind CSS v4 + Recharts.
- **API Gateway Layer:** FastAPI handling HTTP routing, CORS, and Pydantic validation.
- **Service Domain Layer:** Pure Python engines coordinating financial workflows.
- **Financial Computation Layer:** NumPy, SciPy, and CVXPY solving convex quadratic programs.
- **Persistence Layer:** PostgreSQL 16 managed via SQLAlchemy 2.0 ORM with complete audit logging.

---

## 2. The Closed-Loop Control Flow

```text
Market Prices ──► Portfolio State ──► Risk Engine ──► Risk Attribution
                                          │
                                          ▼
                               Safe Operating Envelope
                                 (GREEN / YELLOW / RED)
                                          │
                                          ▼
                                   Control Engine
                                          │
                                          ▼
                          Minimum-Intervention Optimizer (CVXPY)
                                          │
                                          ▼
                               Transaction Cost Engine
                                          │
                                          ▼
                               Independent Validator
                                     (PASS / FAIL)
                                          │
                                          ▼
                               Human Approval Interface
                                          │
                                          ▼
                                 Simulated Rebalance
                                          │
                                          ▼
                               Reverse Stress Re-test
                                          │
                                          ▼
                               PostgreSQL Audit Ledger
```

---

## 3. Core Subsystems

### 3.1 Risk Engine (`backend/app/services/risk_engine.py`)
Computes 6 quantitative metrics and synthesizes a 0–100 composite risk score:
- **30% Volatility:** $\sigma_p = \sqrt{w^T \Sigma w}$
- **25% Maximum Drawdown:** Peak-to-trough decline over historical window
- **20% Concentration (HHI):** Sum of squared weights ($\sum w_i^2$)
- **15% Liquidity:** Weighted average asset liquidity score
- **10% Market Stress:** Current vol relative to historical baseline

### 3.2 Safe Operating Envelope & Control Engine (`backend/app/services/control_engine.py`)
Maps composite risk scores to operating zones:
- **GREEN (Safe, 0–29):** Compliant; avoid unnecessary turnover.
- **YELLOW (Caution, 30–59):** Approaching boundary; advisory alert.
- **ORANGE (Warning, 60–79):** Boundary breach; defensive proposal generated.
- **RED (Crisis, 80–100):** Severe limit breach; mandatory minimum-intervention.
- **Anti-Chattering Hysteresis:** Asymmetric return band ($\delta = 3.0$) prevents oscillation.

### 3.3 Minimum-Intervention Optimizer (`backend/app/services/optimizer.py`)
Solves a convex quadratic program via CVXPY:
$$\min_w \quad \frac{1}{2} \|w - w_{\text{current}}\|_2^2 + \gamma \|w - w_{\text{current}}\|_1 + \lambda w^T \Sigma w - \kappa w^T \mu$$
Subject to dynamic mode constraints (Equity cap, Cash floor, Volatility ceiling).

### 3.4 Independent Validator (`backend/app/services/validator.py`)
Decoupled from the optimizer. Independently checks:
1. Weight sum $= 1.0 \pm 10^{-4}$
2. Long-only $w_i \ge 0$
3. Dynamic Equity cap satisfied
4. Dynamic Cash floor satisfied
5. Single-asset concentration $\le 50\%$
6. Volatility ceiling satisfied

### 3.5 Scenario & Reverse Stress Engine (`backend/app/services/scenario_engine.py`)
- **Forward Stress:** Applies macro shock vectors and evaluates stressed risk.
- **Reverse Stress:** Sweeps shock intensity to identify the exact shock multiplier that breaches the failure threshold ($\text{Score} \ge 80$).

### 3.6 PostgreSQL Audit Persistence
Persists 100% of risk assessments, alerts, optimizer inputs/outputs, validation checks, and rebalance approvals across 11 normalized tables.
