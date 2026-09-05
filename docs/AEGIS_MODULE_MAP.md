# AEGIS: Concrete Module & Component Map

**Product Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
**Document Status:** Canonical Implementation Reference  
**Audit Standard:** 100% of listed files exist in the repository and are verified by tests.

---

## 1. Backend Core & Service Engines (`backend/app/services/`)

### 1.1 Risk Engine
- **File Path:** [`backend/app/services/risk_engine.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/risk_engine.py)
- **Purpose:** Calculates Expected Return, Volatility ($\sigma_p$), Max Drawdown, Concentration HHI, Liquidity Ratio, Market Stress, Value at Risk ($\text{VaR}_{95}$), and Conditional Value at Risk ($\text{CVaR}_{95}$); synthesizes Composite Risk Score (0–100); persists `RiskSnapshot` to database.
- **Inputs:** `db: Session`, `portfolio: Portfolio`, optional `weights_override: np.ndarray`, optional `cov_matrix`, optional `mean_returns`.
- **Outputs:** `RiskResult` object containing 8 calculated metrics; persists snapshot via `save_risk_snapshot()`.
- **Dependencies:** `app/core/formulas.py`, `app/services/market_data_service.py`, `app/services/portfolio_service.py`.
- **Status:** **DONE** (Covered in `test_risk.py`, `test_quant_risk.py`).

---

### 1.2 Control Engine
- **File Path:** [`backend/app/services/control_engine.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/control_engine.py)
- **Purpose:** Evaluates risk metrics against the Safe Operating Envelope (SOE), detects limit breaches, applies asymmetric anti-chattering hysteresis ($\delta = 3.0$), and produces dynamic optimization bounds.
- **Inputs:** `risk: RiskResult`, optional `previous_level: str`.
- **Outputs:** `ControlResult` containing `risk_level`, `operating_mode`, `constraints: dict`, `breaches: list[str]`, `intervention_required: bool`.
- **Dependencies:** `app/core/constants.py`, `app/core/risk_levels.py`.
- **Status:** **DONE** (Covered in `test_controls.py`).

---

### 1.3 Minimum-Intervention CVXPY Optimizer
- **File Path:** [`backend/app/services/optimizer.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/optimizer.py)
- **Purpose:** Solves a convex quadratic program to determine defensive asset allocations subject to dynamic envelope constraints, penalizing portfolio turnover and transaction friction via squared Euclidean tracking $\|w - w_0\|_2^2$ and $L_1$ turnover norm.
- **Inputs:** `mean_returns`, `cov_matrix`, `current_weights`, `assets: list[Asset]`, `portfolio_value: float`, `risk_aversion: float`, `constraints: dict`, `cost_rate: float`.
- **Outputs:** `OptimizerResult` (status, optimal weights, expected return, volatility, transaction cost, explanation); persists `OptimizationRun` and `OptimizationAllocation`.
- **Dependencies:** `cvxpy`, `app/models/optimization.py`, `app/core/formulas.py`.
- **Status:** **DONE** (Covered in `test_optimizer.py`).

---

### 1.4 Scenario Engine (Forward Stress)
- **File Path:** [`backend/app/services/scenario_engine.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/scenario_engine.py)
- **Purpose:** Orchestrates the end-to-end forward stress simulation: applies asset shocks $\to$ recomputes stressed risk $\to$ invokes Control Engine $\to$ triggers Optimizer $\to$ verifies candidate weights via Independent Validator $\to$ packages rebalance recommendation.
- **Inputs:** `db: Session`, `portfolio: Portfolio`, `scenario: Scenario`.
- **Outputs:** Complete simulation response dictionary with `scenario`, `before`, `shock`, `after_shock`, `control`, and `recommendation`.
- **Dependencies:** `risk_engine`, `control_engine`, `optimizer`, `validator`, `rebalancer`, `explanation_service`.
- **Status:** **DONE** (Covered in `test_scenarios.py`, `test_stress_chain.py`).

---

### 1.5 Independent Validator
- **File Path:** [`backend/app/services/validator.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/validator.py)
- **Purpose:** Independently certifies candidate portfolio allocations against mathematical and institutional safety invariants before human review.
- **Inputs:** `candidate_weights: np.ndarray`, `assets: list[Asset]`, `cov_matrix: np.ndarray`, `constraints: dict`.
- **Outputs:** `ValidationResult(status: "PASS" | "FAIL", details: list[str], violations: list[str])`.
- **Invariants Checked:** Budget sum $= 1.0 \pm 10^{-4}$, non-negative $w_i \ge 0$, dynamic equity cap, cash floor, single-asset max concentration $\le 50\%$, volatility ceiling.
- **Status:** **DONE** (Covered in `test_validator.py`).

---

### 1.6 Euler Risk Attribution Engine
- **File Path:** [`backend/app/services/risk_attribution.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/risk_attribution.py)
- **Purpose:** Decomposes portfolio risk to calculate Marginal Risk Contribution ($\text{MCR}_i$) and Percentage Risk Contribution ($\text{PRC}_i$) per asset, identifying the primary risk driver.
- **Inputs:** `weights: np.ndarray`, `cov_matrix: np.ndarray`, `assets: list[Asset]`.
- **Outputs:** `RiskAttributionResponse` containing per-asset metrics (`marginal_contribution`, `absolute_contribution`, `percentage_contribution`, `risk_concentration_ratio`) and `primary_risk_driver`.
- **Status:** **DONE** (Covered in `test_e2e_aegis.py`).

---

### 1.7 Reverse Stress Testing Engine
- **File Path:** [`backend/app/services/reverse_stress.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/reverse_stress.py)
- **Purpose:** Solves backward from the failure threshold (Risk Score $\ge 80.0$) using a deterministic shock sweep ($\alpha \in [0.02, 0.50]$) to find the critical shock multiplier $\alpha^*$ and Distance to Failure (DtF).
- **Inputs:** `db: Session`, `portfolio: Portfolio`, optional `failure_threshold: float`, optional `weights_override`.
- **Outputs:** `ReverseStressResult` ($\alpha^*$, DtF, capital resilience score 0–100, shock progression curve).
- **Status:** **DONE** (Covered in `test_master_system.py`, `test_e2e_aegis.py`).

---

### 1.8 Market Regime & Contagion Services
- **File Paths:**
  - [`backend/app/services/regime_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/regime_service.py)
  - [`backend/app/services/contagion_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/contagion_service.py)
- **Purpose:**
  - `regime_service.py`: Classifies market state into `CALM`, `TRANSITIONAL`, or `CRISIS` with volatility ratios.
  - `contagion_service.py`: Computes baseline vs stressed cross-asset correlation matrices and contagion expansion index ($C_{\text{contagion}}$).
- **Status:** **DONE** (Covered in `test_master_system.py`).

---

### 1.9 Predictive & Learning Services
- **File Paths:**
  - [`backend/app/services/prediction_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/prediction_service.py)
  - [`backend/app/services/learning_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/learning_service.py)
- **Purpose:**
  - `prediction_service.py`: Calculates EWMA volatility forecast ($\lambda = 0.94$), 5-day breach probability, and drawdown confidence intervals.
  - `learning_service.py`: Tracks 5-day forward simulated performance to measure verified capital preserved and loss avoided.
- **Status:** **DONE** (Covered in `test_prediction_service.py`, `test_master_system.py`).

---

### 1.10 Policy RAG & AI Copilot Services
- **File Paths:**
  - [`backend/app/services/document_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/document_service.py)
  - [`backend/app/services/rag_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/rag_service.py)
  - [`backend/app/services/copilot_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/copilot_service.py)
  - [`backend/app/services/llm_service.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/llm_service.py)
  - [`backend/app/services/llm_explanation.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/llm_explanation.py)
- **Purpose:** Complete conversational risk manager with document ingestion (PDF, DOCX, MD), TF-IDF cosine similarity RAG retrieval, Groq Llama-3.3-70B inference, and automated deterministic fiduciary fallback.
- **Status:** **DONE** (Covered in `test_document_rag.py`, `test_copilot_institutional.py`).

---

### 1.11 Market Data Provider Subsystem
- **File Paths:**
  - [`backend/app/services/market_data/base.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/market_data/base.py)
  - [`backend/app/services/market_data/demo_provider.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/market_data/demo_provider.py)
  - [`backend/app/services/market_data/csv_provider.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/market_data/csv_provider.py)
  - [`backend/app/services/market_data/live_provider.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/market_data/live_provider.py)
  - [`backend/app/services/market_data/manager.py`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/backend/app/services/market_data/manager.py)
- **Purpose:** Pluggable market data architecture supporting synthetic demo generation, external CSV upload with DB persistence, and live institutional feed adapter stubs.
- **Status:** **DONE** (Covered in `test_market_data.py`).

---

## 2. API Routes Layer (`backend/app/api/`)

| Endpoint | File Path | Method | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `app/api/health.py` | `GET` | Liveness & DB probe | **DONE** |
| `/api/state/master` | `app/api/master_state.py` | `GET` | Unified master state payload | **DONE** |
| `/api/portfolio` | `app/api/portfolio.py` | `GET` | Holdings & capital | **DONE** |
| `/api/portfolio/update` | `app/api/portfolio.py` | `POST` | Update capital / weights | **DONE** |
| `/api/portfolio/reset` | `app/api/portfolio.py` | `POST` | Reset holdings to baseline | **DONE** |
| `/api/risk` | `app/api/risk.py` | `GET` | Compute risk snapshot | **DONE** |
| `/api/risk/attribution` | `app/api/risk.py` | `GET` | Euler risk decomposition | **DONE** |
| `/api/scenarios` | `app/api/scenarios.py` | `GET` | List stress scenarios | **DONE** |
| `/api/scenarios/run` | `app/api/scenarios.py` | `POST` | Forward stress simulation | **DONE** |
| `/api/stress/reverse` | `app/api/reverse_stress.py` | `POST` | Reverse stress & DtF | **DONE** |
| `/api/optimize` | `app/api/optimization.py` | `POST` | Run CVXPY optimizer | **DONE** |
| `/api/optimization` | `app/api/optimization.py` | `GET` | Recent optimization runs | **DONE** |
| `/api/rebalance` | `app/api/rebalance.py` | `POST` | Approve / reject rebalance | **DONE** |
| `/api/rebalance/history`| `app/api/rebalance.py` | `GET` | Audit decision log | **DONE** |
| `/api/market/regime` | `app/api/market.py` | `GET` | Regime detection | **DONE** |
| `/api/market/contagion` | `app/api/market.py` | `GET` | Correlation contagion | **DONE** |
| `/api/market/provider` | `app/api/market.py` | `GET`/`POST`| Provider status / switch | **DONE** |
| `/api/market/upload-csv`| `app/api/market.py` | `POST` | Ingest price CSV | **DONE** |
| `/api/market/history` | `app/api/market.py` | `GET` | Historical returns | **DONE** |
| `/api/rag/query` | `app/api/rag.py` | `POST` | Policy RAG search | **DONE** |
| `/api/documents` | `app/api/rag.py` | `GET`/`POST`/`DEL`| Manage RAG documents | **DONE** |
| `/api/risk-manager/chat`| `app/api/copilot.py` | `POST` | AI Copilot conversational chat | **DONE** |
| `/api/copilot/context` | `app/api/copilot.py` | `GET` | Raw Copilot context string | **DONE** |
| `/api/audit/outcomes` | `app/api/learning.py` | `GET` | 5-day outcome tracking | **DONE** |

---

## 3. Database Models Layer (`backend/app/models/`)

All 11 normalized models registered in `backend/app/main.py`:
- `asset.py` $\to$ `Asset`
- `portfolio.py` $\to$ `Portfolio`
- `holding.py` $\to$ `Holding`
- `market_data.py` $\to$ `MarketPrice`
- `risk_snapshot.py` $\to$ `RiskSnapshot`
- `optimization.py` $\to$ `OptimizationRun`, `OptimizationAllocation`
- `scenario.py` $\to$ `Scenario`, `ScenarioShock`
- `alert.py` $\to$ `Alert`
- `rebalance.py` $\to$ `RebalanceAction`

---

## 4. Frontend Application Layer (`frontend/src/`)

### 4.1 Root Dashboard & UI
- **File Path:** [`frontend/src/Dashboard.tsx`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/frontend/src/Dashboard.tsx)
- **Size:** 1,834 lines.
- **Features:** 6 interactive tabs (`control`, `contagion`, `attribution`, `reverse`, `portfolio`, `audit`), SVG risk gauge, allocation donut, forward stress simulation, minimum-intervention allocation diff, turnover and transaction friction metrics, Independent Validator badge, and decision outcome ledger.

### 4.2 Supporting Modals & Assistants
- **Data Center Modal:** [`frontend/src/DataCenterModal.tsx`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/frontend/src/DataCenterModal.tsx) (400+ lines). Manages market data feeds (Demo, CSV upload, Live) and institutional policy documents for RAG indexing.
- **Floating AI Copilot:** [`frontend/src/FloatingCopilot.tsx`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/frontend/src/FloatingCopilot.tsx) (500+ lines). Interactive conversational assistant with screen-context awareness and policy citations.
- **API Client:** [`frontend/src/api.ts`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/frontend/src/api.ts) (153 lines). Type-safe Fetch wrapper for all 22 backend endpoints.
- **Type Schemas:** [`frontend/src/types.ts`](file:///c:/Users/HEMANT%20GUPTA/Documents/vibe/OptiCapital/frontend/src/types.ts) (250+ lines). TypeScript interfaces mirroring backend Pydantic schemas.
