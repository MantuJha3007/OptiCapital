# AEGIS: Concrete Module & Component Map

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Document Status:** Canonical Implementation Reference  
**Rule:** All file paths must strictly match the real repository layout. Planned components are marked explicitly as `[PLANNED / TO IMPLEMENT]`.

---

## 1. Backend Core & Service Engines (`backend/app/services/`)

### 1.1 Risk Engine
- **File Path:** [`backend/app/services/risk_engine.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/risk_engine.py)
- **Purpose:** Calculates the portfolio's expected return, volatility, max drawdown, concentration HHI, liquidity ratio, market stress, and composite risk score (0–100).
- **Inputs:** `db: Session`, `portfolio: Portfolio`, optional `weights_override: np.ndarray`, optional `cov_matrix`, optional `mean_returns`.
- **Outputs:** `RiskResult` object containing 8 calculated metrics; persists `RiskSnapshot` to database via `save_risk_snapshot()`.
- **Dependencies:** `backend/app/core/formulas.py`, `backend/app/services/market_data_service.py`, `backend/app/services/portfolio_service.py`.
- **Current Status:** **DONE** (Functions correctly; fully covered in tests).
- **Required Changes:** Incorporate hysteresis state check when mapping continuous risk score to operating level (GREEN/YELLOW/ORANGE/RED).
- **Owner:** Risk / Quantitative Lead.
- **Tests:** `backend/tests/test_risk.py`.

---

### 1.2 Control Engine
- **File Path:** [`backend/app/services/control_engine.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/control_engine.py)
- **Purpose:** Compares risk metrics against the Safe Operating Envelope (SOE), detects metric breaches against baseline limits, and produces dynamic constraint parameters for optimization.
- **Inputs:** `risk: RiskResult`.
- **Outputs:** `ControlResult` containing `risk_level`, `constraints: dict`, `breaches: list[str]`.
- **Dependencies:** `backend/app/core/constants.py`, `backend/app/core/risk_levels.py`.
- **Current Status:** **DONE** (Four modes defined; breach detection against normal constraints works).
- **Required Changes:** Align envelope modes with AEGIS terminology (GREEN / YELLOW / ORANGE / RED) and implement asymmetric hysteresis band ($\delta = 3.0$) to avoid chattering.
- **Owner:** Financial Systems Engineer.
- **Tests:** `backend/tests/test_controls.py`.

---

### 1.3 Minimum-Intervention CVXPY Optimizer
- **File Path:** [`backend/app/services/optimizer.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/optimizer.py)
- **Purpose:** Solves a convex quadratic program to determine defensive asset allocations subject to dynamic envelope constraints, penalizing portfolio turnover and transaction friction.
- **Inputs:** `mean_returns`, `cov_matrix`, `current_weights`, `assets: list[Asset]`, `portfolio_value: float`, `risk_aversion: float`, `constraints: dict`, `cost_rate: float`.
- **Outputs:** `OptimizerResult` (status, optimal weights, expected return, volatility, transaction cost, explanation); persists `OptimizationRun` and `OptimizationAllocation` via `save_optimization_run()`.
- **Dependencies:** `cvxpy`, `backend/app/models/optimization.py`, `backend/app/core/formulas.py`.
- **Current Status:** **PARTIAL** (Solves mean-variance with transaction cost L1 penalty; needs the explicit minimum-intervention objective term $\|w - w_{\text{current}}\|_2^2$).
- **Required Changes:** Update objective function to prioritize minimum deviation from current portfolio ($\frac{1}{2} \|w - w_{\text{current}}\|_2^2 + \gamma \|w - w_{\text{current}}\|_1 + \lambda w^T \Sigma w - \kappa w^T \mu$).
- **Owner:** Optimization Engineer.
- **Tests:** `backend/tests/test_optimizer.py`.

---

### 1.4 Scenario Engine
- **File Path:** [`backend/app/services/scenario_engine.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/scenario_engine.py)
- **Purpose:** Orchestrates the end-to-end forward stress simulation: applies asset shocks $\to$ recomputes stressed risk $\to$ invokes Control Engine $\to$ triggers Optimizer $\to$ persists run records $\to$ packages complete before/after response.
- **Inputs:** `db: Session`, `portfolio: Portfolio`, `scenario: Scenario`.
- **Outputs:** Detailed simulation response dictionary with `scenario`, `before`, `shock`, `after_shock`, `control`, and `recommendation`.
- **Dependencies:** All core services (`risk_engine`, `control_engine`, `optimizer`, `rebalancer`, `explanation_service`).
- **Current Status:** **DONE** (Complete pipeline operates end-to-end).
- **Required Changes:** Hook into the Independent Validator service before building final recommendation payload.
- **Owner:** Backend Lead.
- **Tests:** `backend/tests/test_scenarios.py`.

---

### 1.5 Independent Validator [PLANNED / TO IMPLEMENT]
- **File Path:** `backend/app/services/validator.py`
- **Purpose:** Independently verifies candidate portfolio allocations against mathematical and institutional safety invariants before human presentation.
- **Inputs:** `candidate_weights: np.ndarray`, `assets: list[Asset]`, `cov_matrix: np.ndarray`, `constraints: dict`.
- **Outputs:** `ValidationResult(status: "PASS" | "FAIL", details: list[str], violations: list[str])`.
- **Dependencies:** `numpy`, `backend/app/core/formulas.py`.
- **Current Status:** **MISSING** (Candidate weights currently pass directly from optimizer to database without independent certification).
- **Required Changes:** Implement verification checks: sum equals 1.0 ($\pm 10^{-4}$), non-negative bounds ($w_i \ge 0$), dynamic equity limit, cash floor, volatility ceiling, single-asset maximum concentration ($\le 50\%$).
- **Owner:** Risk / Security Engineer.
- **Tests:** `backend/tests/test_validator.py` (To create).

---

### 1.6 Risk Attribution Engine [PLANNED / TO IMPLEMENT]
- **File Path:** `backend/app/services/risk_attribution.py`
- **Purpose:** Decomposes portfolio risk to calculate marginal risk contribution ($\text{MCR}_i$) and percentage risk contribution ($\text{PRC}_i$) per asset.
- **Inputs:** `weights: np.ndarray`, `cov_matrix: np.ndarray`, `assets: list[Asset]`.
- **Outputs:** `list[RiskAttributionItem]` with asset symbol, capital weight, absolute risk contribution, percentage of total risk, and concentration flag.
- **Dependencies:** `numpy`, `backend/app/models/asset.py`.
- **Current Status:** **MISSING** (Current system produces aggregate score but does not expose asset-level marginal risk decomposition).
- **Required Changes:** Implement Euler's risk decomposition: $\text{ARC}_i = \frac{w_i (\Sigma w)_i}{\sigma_p}$ and $\text{PRC}_i = \frac{\text{ARC}_i}{\sigma_p}$.
- **Owner:** Quantitative Analyst.
- **Tests:** `backend/tests/test_attribution.py` (To create).

---

### 1.7 Reverse Stress Engine [PLANNED / TO IMPLEMENT]
- **File Path:** `backend/app/services/reverse_stress.py`
- **Purpose:** Determines the failure boundary by performing a deterministic shock sweep to find the minimum market shock that breaches the RED envelope threshold (Risk Score $\ge 80$).
- **Inputs:** `db: Session`, `portfolio: Portfolio`, optional `failure_threshold: float`.
- **Outputs:** `ReverseStressResult` (critical shock multiplier $\alpha^*$, distance to failure, failure score, resilience score 0–100, sweep progression data).
- **Dependencies:** `backend/app/services/risk_engine.py`, `backend/app/services/portfolio_service.py`.
- **Current Status:** **MISSING** (Only forward stress testing currently exists).
- **Required Changes:** Implement deterministic sweep over shock intensity $\alpha \in [0.02, 0.50]$ with composite crash vector and calculate Distance to Failure.
- **Owner:** Quantitative Engineer.
- **Tests:** `backend/tests/test_reverse_stress.py` (To create).

---

### 1.8 Rebalancer & Simulated Execution
- **File Path:** [`backend/app/services/rebalancer.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/rebalancer.py)
- **Purpose:** Determines recommended action (`HOLD`, `REBALANCE`, `CRISIS_PROTECTION`) and processes human approval/rejection, updating simulated holdings in PostgreSQL.
- **Inputs:** `db: Session`, `optimization_id: UUID`, `approved: bool`.
- **Outputs:** Execution status summary; updates `holdings` weights/values and `rebalance_actions` audit rows.
- **Dependencies:** `backend/app/models/rebalance.py`, `backend/app/models/holding.py`, `backend/app/models/portfolio.py`.
- **Current Status:** **DONE** (Action classification, approval, rejection, and database update work cleanly).
- **Required Changes:** Ensure post-rebalance recalculation updates the portfolio's last-known envelope status.
- **Owner:** Backend Lead.
- **Tests:** `backend/tests/test_rebalance.py`.

---

### 1.9 Explanation Service
- **File Path:** [`backend/app/services/explanation_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/explanation_service.py)
- **Purpose:** Generates deterministic, human-readable executive summaries detailing risk scores, breaches, asset weight changes, and volatility improvements.
- **Inputs:** `risk_before`, `risk_after`, `control`, `assets`, `old_weights`, `new_weights`.
- **Outputs:** Formatted multi-line string explanation.
- **Dependencies:** `backend/app/services/risk_engine.py`, `backend/app/services/control_engine.py`.
- **Current Status:** **DONE** (Template generator produces clear bulleted explanations).
- **Required Changes:** Extend to highlight Distance to Failure and Validator status.
- **Owner:** AI / Full-Stack Engineer.
- **Tests:** Integrated via `test_scenarios.py`.

---

### 1.10 Market Data & Portfolio Services
- **File Paths:**
  - [`backend/app/services/market_data_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/market_data_service.py)
  - [`backend/app/services/portfolio_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/portfolio_service.py)
- **Purpose:**
  - `market_data_service.py`: Computes price returns, historical annualized volatility, and asset covariance matrices.
  - `portfolio_service.py`: Loads default portfolio, holdings, asset vectors, and valuations.
- **Current Status:** **DONE** (Both services are robust and fully functional).

---

## 2. API Routes Layer (`backend/app/api/`)

| Endpoint | File Path | Method | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | [`backend/app/api/health.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/api/health.py) | `GET` | System liveness and DB connectivity check. | **DONE** |
| `/api/portfolio` | [`backend/app/api/portfolio.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/api/portfolio.py) | `GET` | Get portfolio valuation, cash, and holdings. | **DONE** |
| `/api/risk` | [`backend/app/api/risk.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/api/risk.py) | `GET` | Compute and snapshot active portfolio risk metrics. | **DONE** |
| `/api/risk/attribution` | `backend/app/api/risk.py` | `GET` | Compute asset-level risk contribution breakdown. | **TODO** |
| `/api/scenarios` | [`backend/app/api/scenarios.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/api/scenarios.py) | `GET` | List available stress scenarios and shocks. | **DONE** |
| `/api/scenarios/run` | [`backend/app/api/scenarios.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/api/scenarios.py) | `POST` | Execute forward scenario simulation. | **DONE** |
| `/api/stress/reverse` | `backend/app/api/scenarios.py` | `POST` | Execute reverse stress test and return DtF. | **TODO** |
| `/api/optimize` | [`backend/app/api/optimization.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/api/optimization.py) | `POST` | Run standalone minimum-intervention optimizer. | **DONE** |
| `/api/optimization` | [`backend/app/api/optimization.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/api/optimization.py) | `GET` | Retrieve recent optimization run logs. | **DONE** |
| `/api/rebalance` | [`backend/app/api/rebalance.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/api/rebalance.py) | `POST` | Approve or reject rebalance recommendation. | **DONE** |
| `/api/rebalance/history`| [`backend/app/api/rebalance.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/api/rebalance.py) | `GET` | Retrieve rebalance action audit log. | **DONE** |

---

## 3. Database Models Layer (`backend/app/models/`)

All 11 tables map to existing models registered in `backend/app/main.py`:
- `asset.py` $\to$ `Asset`
- `portfolio.py` $\to$ `Portfolio`
- `holding.py` $\to$ `Holding`
- `market_data.py` $\to$ `MarketPrice`
- `risk_snapshot.py` $\to$ `RiskSnapshot`
- `optimization.py` $\to$ `OptimizationRun`, `OptimizationAllocation`
- `scenario.py` $\to$ `Scenario`, `ScenarioShock`
- `alert.py` $\to$ `Alert`
- `rebalance.py` $\to$ `RebalanceAction`
- **Current Status:** **DONE** (Schema is normalized, relational keys configured, fully operational).

---

## 4. Frontend Application Layer (`frontend/src/`)

### 4.1 Root Dashboard & UI
- **File Path:** [`frontend/src/Dashboard.tsx`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/frontend/src/Dashboard.tsx)
- **Purpose:** Primary user interface rendering portfolio summary, risk gauge, allocation chart, scenario runner, before/after metrics comparison, and approval buttons.
- **Current Status:** **DONE** (568 lines, rich aesthetics, responsive design).
- **Required Changes:**
  1. Add Safe Operating Envelope zone badge with hysteresis indicator.
  2. Add Independent Validator verification badge (PASS / FAIL).
  3. Add Risk Attribution bar chart (Capital Weight vs Percentage Risk Contribution).
  4. Add Reverse Stress / Distance to Failure card.

### 4.2 API Client & Typed Schemas
- **File Paths:**
  - [`frontend/src/api.ts`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/frontend/src/api.ts)
  - [`frontend/src/types.ts`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/frontend/src/types.ts)
- **Current Status:** **DONE** (Cleanly typed, handles error envelopes).
- **Required Changes:** Add interfaces for `RiskAttributionItem`, `ValidationResult`, and `ReverseStressResponse`.
