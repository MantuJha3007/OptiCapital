# AEGIS Architecture Overview

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Authoritative Blueprint:** See [CURRENT_SYSTEM_ARCHITECTURE.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/CURRENT_SYSTEM_ARCHITECTURE.md)  
**Detailed Technical Specification:** See [AEGIS_TECHNICAL_ARCHITECTURE.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_TECHNICAL_ARCHITECTURE.md)  
**Master Product Specification:** See [AEGIS_FINAL_PRODUCT_SPECIFICATION.md](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/docs/AEGIS_FINAL_PRODUCT_SPECIFICATION.md)  

---

## 1. System Overview

AEGIS follows a layered, service-oriented architecture built on modern Python and TypeScript technologies:
- **Presentation Layer:** React 18 + TypeScript + Vite + Tailwind CSS v4 + Recharts with 6 operational cockpit tabs, an interactive Floating AI Copilot, and a Data Center management modal.
- **API Gateway Layer:** FastAPI handling 22 REST endpoints, CORS, lifespan initialization, and Pydantic v2 validation.
- **Service Domain Layer:** 14 pure Python services coordinating quantitative analysis, risk control, and AI intelligence.
- **Financial Computation Layer:** NumPy, SciPy, and CVXPY solving convex quadratic programs with Euclidean tracking and turnover penalties.
- **AI & RAG Layer:** Screen-context-aware institutional risk manager powered by Groq (`llama-3.3-70b-versatile`) with an automated deterministic fiduciary fallback and in-memory TF-IDF policy document retrieval.
- **Market Feed Subsystem:** Pluggable provider architecture supporting synthetic demo generation, external CSV file ingestion with DB persistence, and live feed adapter stubs.
- **Persistence Layer:** Dual compatibility supporting both SQLite (local zero-config default: `opti_capital.db`) and PostgreSQL 16 (docker production) managed via SQLAlchemy 2.0 with complete audit immutability.

---

## 2. The Closed-Loop Control Flow

```text
Market Prices ──► Portfolio State ──► Risk Engine ──► Regime & Contagion
                                          │
                                          ▼
                               Safe Operating Envelope
                               (GREEN / YELLOW / ORANGE / RED)
                                          │
                                          ▼
                                    Control Engine
                                          │
                                          ▼
                         Euler Marginal Risk Attribution
                                          │
                                          ▼
                        Minimum-Intervention Optimizer (CVXPY)
                                          │
                                          ▼
                              Independent Safety Validator
                                    (6 Safety Invariants)
                                          │
                                          ▼
                            Policy RAG & Institutional Copilot
                                          │
                                          ▼
                              Human-in-the-Loop Decision
                              [APPROVE] / [REJECT] Rebalance
                                          │
                                          ▼
                                 Simulated Execution
                                          │
                                          ▼
                                Reverse Stress Re-Test
                            (Distance to Failure α* & DtF)
                                          │
                                          ▼
                             Immutable PostgreSQL/SQLite Audit
                              (& 5-Day Outcome Surveillance)
```

---

## 3. Core Subsystems

### 3.1 Quantitative Risk Engine (`backend/app/services/risk_engine.py`)
Computes 8 quantitative metrics, Value at Risk ($\text{VaR}_{95}$), Conditional Value at Risk ($\text{CVaR}_{95}$), and synthesizes a 0–100 composite risk score:
- **30% Volatility:** $\sigma_p = \sqrt{w^T \Sigma w}$
- **25% Maximum Drawdown:** Peak-to-trough decline over historical window
- **20% Concentration (HHI):** Sum of squared weights ($\sum w_i^2$)
- **15% Liquidity:** Weighted average asset liquidity score
- **10% Market Stress:** Current vol relative to historical baseline

### 3.2 Safe Operating Envelope & Control Engine (`backend/app/services/control_engine.py`)
Maps composite risk scores to dynamically parameterized operating zones:
- **GREEN (Safe, 0–29):** Compliant; turnover suppressed (`HOLD`).
- **YELLOW (Caution, 30–59):** Approaching boundary; advisory alert (`ADVISORY`).
- **ORANGE (Warning, 60–79):** Boundary breach; defensive proposal generated (`REBALANCE`).
- **RED (Crisis, 80–100):** Severe limit breach; mandatory minimum-intervention (`CRISIS_PROTECTION`).
- **Anti-Chattering Hysteresis:** Asymmetric buffer ($\delta = 3.0$) prevents boundary oscillation.

### 3.3 Minimum-Intervention CVXPY Optimizer (`backend/app/services/optimizer.py`)
Solves a convex quadratic program penalizing deviations from current allocation and turnover:
$$\min_w \quad \frac{1}{2} \|w - w_{\text{current}}\|_2^2 + \gamma \|w - w_{\text{current}}\|_1 + \lambda w^T \Sigma w - \kappa w^T \mu$$
Subject to dynamic zone constraints (Equity cap, Cash floor, Volatility ceiling).

### 3.4 Independent Validator (`backend/app/services/validator.py`)
Decoupled safety certification gate. Independently checks:
1. Weight sum $= 1.0 \pm 10^{-4}$
2. Long-only non-negative $w_i \ge 0$
3. Dynamic Equity cap satisfied
4. Dynamic Cash floor satisfied
5. Single-asset concentration $\le 50\%$
6. Volatility ceiling satisfied

### 3.5 Euler Risk Attribution (`backend/app/services/risk_attribution.py`)
Decomposes portfolio volatility to identify the primary risk driver:
$$\text{MCR}_i = \frac{(\Sigma w)_i}{\sigma_p}, \quad \text{PRC}_i = \frac{w_i (\Sigma w)_i}{\sigma_p^2}$$

### 3.6 Reverse Stress Testing (`backend/app/services/reverse_stress.py`)
Sweeps shock intensity backwards to identify the critical shock multiplier $\alpha^*$ where Risk Score reaches 80.0, computing the portfolio's Distance to Failure (DtF) and Capital Resilience Score (0–100).

### 3.7 Institutional AI Copilot & Policy RAG (`backend/app/services/copilot_service.py`)
- Screen-context-aware conversational risk assistant.
- Ingests institutional compliance policies and retrieves relevant excerpts via TF-IDF cosine similarity.
- Powered by Groq `llama-3.3-70b-versatile` with an automatic deterministic fiduciary fallback.

### 3.8 Pluggable Market Data & Ingestion (`backend/app/services/market_data/`)
- Dynamic runtime switching between Synthetic Demo generation, CSV upload with DB persistence, and live feed adapter stubs.

### 3.9 Audit Persistence & 5-Day Outcome Surveillance
- Persists 100% of risk assessments, alerts, optimizer inputs/outputs, validation checks, and rebalance approvals across 11 normalized tables with dual PostgreSQL/SQLite support.
- Forward 5-day surveillance evaluates capital preserved and loss avoided.
