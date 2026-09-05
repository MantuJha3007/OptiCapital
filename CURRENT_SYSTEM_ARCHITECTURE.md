# AEGIS: Current System Architecture & Technical Blueprint
## The Authoritative Institutional Source of Truth for OptiCapital / AEGIS

> **System Identity:** AEGIS (Adaptive Capital Resilience & Risk-Control System)  
> **Repository:** `MantuJha3007/OptiCapital`  
> **Operational Status:** Complete & Verified (97/97 Pytest Unit & Integration Tests Passing)  
> **Boundary Notice:** Simulation and supervisory decision-support system. It does not route live orders to commercial brokerage gateways.

---

## 1. Project Purpose & High-Level Architecture

Traditional portfolio management treats asset allocation as an **open-loop mathematical optimization**—continually chasing theoretical "optimal" weights, causing excessive portfolio turnover, incurring severe transaction fee drag, and failing when crisis correlations converge toward 1.0.

**AEGIS reframes institutional portfolio management as a closed-loop supervisory control system:**

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     THE AEGIS CLOSED LOOP                                       │
│                                                                                                 │
│   [Market Data Feeds] ──► [Portfolio State] ──► [Quantitative Risk Engine]                      │
│   (Demo / CSV / Live)      (₹1 Cr Holdings)      (6 Core Metrics + VaR/CVaR)                    │
│                                                              │                                  │
│                                                              ▼                                  │
│                                                   [Regime & Contagion Lens]                     │
│                                                   (Calm/Stressed Correlation)                   │
│                                                              │                                  │
│                                                              ▼                                  │
│                                                  [Safe Operating Envelope]                      │
│                                                  (GREEN / YELLOW / ORANGE / RED)                │
│                                                              │                                  │
│          ┌───────────────────────────────────────────────────┴───────────────────────┐          │
│          ▼                                                                           ▼          │
│   [Forward Stress Engine]                                                     [Control Engine]  │
│   (-30% Crash / Inflation)                                                    (Detect Breaches) │
│          │                                                                           │          │
│          └───────────────────────────────────┬───────────────────────────────────────┘          │
│                                              ▼                                                  │
│                                 [Euler Risk Attribution]                                        │
│                                 (Marginal Risk Contribution)                                    │
│                                              │                                                  │
│                                              ▼                                                  │
│                              [Minimum-Intervention Optimizer]                                   │
│                              (CVXPY Quadratic Program + L1 Fee Drag)                            │
│                                              │                                                  │
│                                              ▼                                                  │
│                                   [Independent Validator]                                       │
│                                   (6 Invariant Safety Gates)                                    │
│                                              │                                                  │
│                                              ▼                                                  │
│                            [AI Copilot & Policy RAG Retrieval]                                  │
│                            (Groq Llama-3.3-70B + Fiduciary Fallback)                            │
│                                              │                                                  │
│                                              ▼                                                  │
│                                    [Human-in-the-Loop]                                          │
│                                 [APPROVE] / [REJECT] Rebalance                                  │
│                                              │                                                  │
│                                              ▼                                                  │
│                                    [Reverse Stress Lab]                                         │
│                                (Distance to Failure α* & DtF)                                   │
│                                              │                                                  │
│                                              ▼                                                  │
│                                  [Immutable PostgreSQL Audit]                                   │
│                                  (& 5-Day Outcome Surveillance)                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Guiding Architectural Invariants
1. **AI Detects & Explains, Deterministic Math Governs:** Math calculations (covariance, VaR, Euler attribution, CVXPY optimization) are strictly deterministic and reproducible. Generative AI is restricted to conversational synthesis, screen context explanation, and policy interpretation.
2. **Minimum Necessary Intervention:** The optimizer penalizes deviations from the current allocation $\|w - w_0\|_2^2$ and turnover $\|w - w_0\|_1$, trading only what is strictly necessary to return within the Safe Operating Envelope.
3. **Decoupled Independent Certification:** The candidate portfolio generated by the optimizer is evaluated by an independent validation gate that tests 6 non-negotiable safety invariants before human review.
4. **Anti-Chattering Hysteresis:** Zone transitions employ asymmetric hysteresis ($\delta = 3.0$) so that transient volatility oscillations do not generate repetitive trading signals.

---

## 2. Repository Directory Structure

```text
OptiCapital/
├── CURRENT_SYSTEM_ARCHITECTURE.md          # Canonical system specification (this document)
├── README.md                               # Project quickstart, setup, and executive overview
├── docker-compose.yml                      # Multi-container orchestration (PostgreSQL, Backend, Frontend)
├── docs/                                   # In-depth architectural & reference documents
│   ├── AEGIS_ARCHITECTURE_DECISIONS.md     # ADRs 1–10 (Design decisions and rationale)
│   ├── AEGIS_DEMO_FLOW.md                  # 23-step judging demo storyboard and script
│   ├── AEGIS_FINAL_PRODUCT_SPECIFICATION.md# Full 34-area product specification
│   ├── AEGIS_IMPLEMENTATION_ROADMAP.md     # Engineering roadmap and milestones
│   ├── AEGIS_IMPLEMENTATION_STATUS.md      # Reality-checked implementation verification tracker
│   ├── AEGIS_MODULE_MAP.md                 # Complete code-to-module mapping
│   ├── AEGIS_TECHNICAL_ARCHITECTURE.md     # Detailed 3-tier architectural blueprint
│   ├── api.md                              # Complete REST API reference and contracts
│   ├── architecture.md                     # High-level architecture summary
│   ├── database.md                         # Database schema, relationships, and audit rules
│   ├── demo-script.md                      # 3-minute presentation cheat-sheet
│   └── financial-model.md                  # Formulas, mathematical proofs, and quant logic
├── backend/
│   ├── Dockerfile                          # Backend container definition
│   ├── requirements.txt                    # Python dependencies
│   ├── opti_capital.db                     # SQLite database instance (zero-config default)
│   ├── app/
│   │   ├── main.py                         # FastAPI application factory and lifespan lifecycle
│   │   ├── config.py                       # Pydantic Settings (env variables, paths, models)
│   │   ├── database.py                     # SQLAlchemy engine, session factory, dual SQLite/PG
│   │   ├── api/                            # REST API route controllers
│   │   │   ├── health.py                   # GET /api/health
│   │   │   ├── master_state.py             # GET /api/state/master (Unified single-call contract)
│   │   │   ├── portfolio.py                # GET /api/portfolio, POST /update, POST /reset
│   │   │   ├── risk.py                     # GET /api/risk, GET /api/risk/attribution
│   │   │   ├── scenarios.py                # GET /api/scenarios, POST /api/scenarios/run
│   │   │   ├── reverse_stress.py           # POST /api/stress/reverse
│   │   │   ├── optimization.py             # POST /api/optimize, GET /api/optimization
│   │   │   ├── rebalance.py                # POST /api/rebalance, GET /api/rebalance/history
│   │   │   ├── market.py                   # GET /regime, GET /contagion, GET/POST /provider, etc.
│   │   │   ├── rag.py                      # POST /api/rag/query, POST /api/rag/search, /documents
│   │   │   ├── copilot.py                  # POST /api/risk-manager/chat, /copilot/chat, /context
│   │   │   └── learning.py                 # GET /api/audit/outcomes
│   │   ├── core/                           # Quant primitives and domain constants
│   │   │   ├── constants.py                # Baseline constraints, penalty parameters, tolerances
│   │   │   ├── formulas.py                 # Pure quant math (covariance, VaR, CVaR, HHI, turnover)
│   │   │   └── risk_levels.py              # Safe Operating Envelope thresholds & hysteresis
│   │   ├── models/                         # SQLAlchemy 2.0 ORM database models (11 tables)
│   │   │   ├── asset.py                    # Asset universe and bounds
│   │   │   ├── portfolio.py                # Portfolio metadata and total capital
│   │   │   ├── holding.py                  # Current asset weight and valuation
│   │   │   ├── market_data.py              # Historical OHLC market prices
│   │   │   ├── risk_snapshot.py            # Immutable risk calculation logs
│   │   │   ├── optimization.py             # OptimizationRun & OptimizationAllocation
│   │   │   ├── alert.py                    # Threshold breach alerts
│   │   │   ├── rebalance.py                # Human approval/rejection audit trail
│   │   │   └── scenario.py                 # Predefined stress scenarios and shock vectors
│   │   ├── schemas/                        # Pydantic v2 request/response validation schemas
│   │   │   ├── asset.py, portfolio.py, risk.py, scenario.py, optimization.py, rebalance.py
│   │   ├── seed/                           # Database seeding and initialization
│   │   │   └── seed_database.py            # Idempotent seed script (assets, portfolio, 250d OHLC)
│   │   └── services/                       # Business logic domain service layer
│   │       ├── portfolio_service.py        # Portfolio loading, asset vectors, updates, resets
│   │       ├── market_data_service.py      # Return series, covariance matrices, historical stats
│   │       ├── risk_engine.py              # 6 metrics, VaR/CVaR, composite risk scoring
│   │       ├── control_engine.py           # SOE evaluation, breach detection, dynamic bounds
│   │       ├── optimizer.py                # CVXPY minimum-intervention quadratic solver
│   │       ├── validator.py                # Independent 6-invariant safety gate
│   │       ├── risk_attribution.py         # Euler marginal & percentage risk decomposition
│   │       ├── scenario_engine.py          # Forward stress testing and full rebalance proposal
│   │       ├── reverse_stress.py           # Reverse stress sweep, critical shock α*, DtF
│   │       ├── rebalancer.py               # Human approval execution & simulated rebalancing
│   │       ├── explanation_service.py      # Deterministic bulleted decision explanations
│   │       ├── regime_service.py           # Regime detection (Calm, Stressed, Transition)
│   │       ├── contagion_service.py        # Correlation contagion matrix calculation
│   │       ├── prediction_service.py       # EWMA vol forecasting, RED breach probability
│   │       ├── learning_service.py         # 5-day simulated outcome tracking & surveillance
│   │       ├── document_service.py         # Policy chunking, indexing, and management
│   │       ├── rag_service.py              # TF-IDF cosine similarity RAG retrieval engine
│   │       ├── copilot_service.py          # Conversational Copilot orchestrator & router
│   │       ├── llm_service.py              # Groq API client (llama-3.3-70b-versatile)
│   │       ├── llm_explanation.py          # Boardroom narrative synthesis with fallback
│   │       └── market_data/                # Pluggable market data provider package
│   │           ├── base.py                 # Abstract MarketDataProvider interface
│   │           ├── demo_provider.py        # Synthetic correlated geometric Brownian motion
│   │           ├── csv_provider.py         # CSV file ingestion with DB persistence
│   │           ├── live_provider.py        # Real-time institutional feed adapter stub
│   │           └── manager.py              # Active provider lifecycle manager
│   ├── data/
│   │   └── policies/                       # Institutional policy documents for RAG indexing
│   │       ├── investment_policy_statement.md
│   │       ├── sebi_risk_governance.md
│   │       └── crisis_research.md
│   └── tests/                              # Pytest test suite (97 tests passing)
│       ├── test_risk.py, test_quant_risk.py, test_controls.py, test_optimizer.py
│       ├── test_validator.py, test_scenarios.py, test_stress_chain.py, test_rebalance.py
│       ├── test_e2e_aegis.py, test_master_state_api.py, test_master_system.py
│       ├── test_market_data.py, test_prediction_service.py, test_document_rag.py
│       └── test_copilot_institutional.py
└── frontend/
    ├── package.json                        # Node dependencies (React 18, Vite, Lucide, Recharts)
    ├── vite.config.ts                      # Vite configuration with /api proxy to port 8000
    ├── tsconfig.json                       # TypeScript compiler options
    └── src/
        ├── main.tsx                        # React application entrypoint
        ├── App.tsx                         # Root component rendering Dashboard
        ├── index.css                       # Complete institutional dark-mode design system
        ├── types.ts                        # TypeScript interfaces mirroring backend schemas
        ├── api.ts                          # Type-safe Fetch API client for all endpoints
        ├── Dashboard.tsx                   # Master operational cockpit (6 tabs + controls)
        ├── FloatingCopilot.tsx             # Interactive floating AI Risk Assistant
        └── DataCenterModal.tsx             # Market Feeds & Company Policy RAG Manager
```

---

## 3. Frontend Architecture

The frontend is an institutional, high-density Single Page Application built with **React 18, TypeScript, Vite, Tailwind CSS v4, and Recharts**.

### 3.1 Design System & Aesthetic Foundation
Defined in `frontend/src/index.css`:
- **Color Palette:** Deep obsidian dark mode (`#0b0f19` background, `#121829` card surface, `#1e293b` borders).
- **Asset Classes:** Equity (`#6366f1` Indigo), Gov Bonds (`#06b6d4` Cyan), Corp Bonds (`#8b5cf6` Violet), Gold (`#f59e0b` Amber), Cash (`#10b981` Emerald).
- **Risk Zones:** SAFE (`#10b981`), WARNING (`#f59e0b`), STRESS (`#f97316`), CRISIS (`#ef4444`).
- **Typography:** Inter / system-ui font stack with tabular figures for financial values.
- **Micro-Interactions:** Smooth SVG gauge transition, glassmorphism cards, animated pulse badges.

### 3.2 Navigation & The Six Operational Views
The cockpit organizes risk management into **6 dedicated tabs**:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [AEGIS Logo]  Capital: ₹1.00 Cr  |  Mode: SAFE [GREEN]  |  Feed: DEMO_PROVIDER          │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────┐ │
│ │1.Command Ctr │2.Contagion   │3.Attribution │4.Rev Stress  │5.Portfolio   │6.Audit   │ │
│ └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Tab 1: Command Center (`control`)**
   - **Risk Gauge:** 180° SVG radial gauge rendering composite score (0–100) and SOE operating zone.
   - **Portfolio Summary:** Total capital (INR), expected return, max drawdown, liquidity ratio.
   - **Allocation Donut:** Recharts pie chart showing asset weights against investment limits.
   - **Stress Lab Simulation:** Select predefined scenarios (`Market Crash`, `High Inflation`, `Tech Shock`, `Normal Market`) and execute forward shocks.
   - **Intervention Panel:** Displays threshold breaches, minimum-intervention proposed allocation diff, turnover %, estimated transaction fee (bps), and Independent Validator certification badge (`PASS`/`FAIL`).
   - **Human Decision Buttons:** `[APPROVE REBALANCE]` updates simulated holdings; `[REJECT]` cancels.
   - **Before/After Verification:** Real-time delta cards proving volatility and risk score reduction.

2. **Tab 2: Correlation Contagion (`contagion`)**
   - Renders the cross-asset correlation matrix under **Normal Market Conditions** vs **Stressed Market Conditions**.
   - Displays average correlation expansion metric ($C_{\text{contagion}}$) proving diversification breakdown during liquidity panics.
   - Highlights crisis contagion clusters where correlation spikes toward 1.0.

3. **Tab 3: Euler Risk Attribution (`attribution`)**
   - Visualizes asset-level **Marginal Risk Contribution (MCR)** and **Percentage Risk Contribution (PRC)**.
   - Bar chart contrasting Capital Allocation Weight vs Risk Contribution Weight.
   - Automatically identifies the **Primary Risk Driver** (e.g., Equity accounting for 91% of risk despite being only 38% of capital).

4. **Tab 4: Reverse Stress Lab (`reverse`)**
   - Solves for the portfolio's **Distance to Failure (DtF)** and Critical Shock Multiplier ($\alpha^*$).
   - Interactive **Failure Threshold Slider** (default: 80.0 CRISIS score).
   - Parameter shock curve showing the exact market loss percentage required to break capital boundaries.
   - **Capital Resilience Score (0–100)** showing resilience improvement after rebalancing.

5. **Tab 5: Portfolio Configuration & Capital (`portfolio`)**
   - Dynamic asset weight adjustment sliders with real-time budget normalization.
   - Total capital adjustment input (e.g., test ₹50 Lakhs vs ₹10 Crores).
   - `[APPLY MANUAL REBALANCE]` and `[RESET TO DEFAULT ₹1 CR]` controls.

6. **Tab 6: Audit & Decision Outcomes (`audit`)**
   - Comprehensive audit log of every historical rebalance, action, transaction fee, and reason.
   - **5-Day Forward Outcome Tracking:** Displays simulated forward surveillance metrics (Verified Capital Preserved, Loss Avoided ₹, Volatility Reduction %).

### 3.3 Supporting Modals & Assistants
- **Data Center Modal (`DataCenterModal.tsx`):**
  - **Market Data Feeds:** Switch active provider between Synthetic Demo, Custom CSV upload, and Live Feed stub. Upload custom price CSVs with automatic DB persistence.
  - **Policy Knowledge Base & RAG:** Upload regulatory/firm PDF, DOCX, or MD documents, inspect indexed document chunks, view document stats, and test semantic search queries.
- **Floating AI Risk Copilot (`FloatingCopilot.tsx`):**
  - Persistent conversational assistant docked at the bottom-right.
  - **Screen Context Awareness:** Automatically passes current view (`COMMAND_CENTER`, `CONTAGION`, `ATTRIBUTION`, `REVERSE_STRESS`, `PORTFOLIO`, `AUDIT`) to inform AI answers.
  - **Regulatory Evidence:** Directly cites institutional policy documents (IPS, SEBI, Crisis Research) with expandable excerpts.
  - **Fiduciary Guardrails:** Powered by Groq `llama-3.3-70b-versatile` with an automated deterministic fallback engine that synthesizes answers even when an API key is not configured.

---

## 4. Backend Architecture

The backend is built on **FastAPI (Python 3.11+)** and follows a **Service-Oriented Layered Domain Architecture**.

### 4.1 Request Pipeline & Execution Flow
```text
HTTP Request
  ├── 1. FastAPI Router (`app/api/*.py`)
  │      - Validates payload via Pydantic (`app/schemas/*.py`)
  │      - Injects database session via `Depends(get_db)`
  ├── 2. Service Layer (`app/services/*.py`)
  │      - Encapsulates pure domain logic and quantitative algorithms
  │      - Stateless pipelines: inputs in, results out
  ├── 3. Quant Core & CVXPY (`app/core/`, `cvxpy`, `numpy`)
  │      - Matrix operations, covariance calculations, convex quadratic solver
  ├── 4. Persistence Layer (`app/models/*.py`, SQLAlchemy 2.0)
  │      - Manages transactions and writes immutable audit logs
  └── 5. HTTP Response (Pydantic serialization)
```

### 4.2 The 14 Domain Services
1. **`portfolio_service.py`**: Loads default portfolio, retrieves active holdings, formats asset vectors, handles manual updates and resets.
2. **`market_data_service.py`**: Queries historical daily OHLC prices, computes 250-day log return series, annualized historical volatility, and asset covariance matrix.
3. **`risk_engine.py`**: Evaluates the 6 core metrics: Expected Return, Volatility ($\sigma_p$), Maximum Drawdown, Liquidity Ratio, Concentration (HHI), and Market Stress. Calculates Value-at-Risk ($\text{VaR}_{95}$), Conditional Value-at-Risk ($\text{CVaR}_{95}$), composite risk score (0–100), and records immutable snapshots.
4. **`control_engine.py`**: Evaluates metrics against the Safe Operating Envelope, checks threshold breaches, applies asymmetric anti-chattering hysteresis, and generates dynamic optimization bounds.
5. **`optimizer.py`**: Formulates and solves the convex quadratic program using **CVXPY** (solvers: CLARABEL $\to$ OSQP $\to$ SCS) with Euclidean minimum-intervention tracking $\|w - w_0\|_2^2$ and $L_1$ turnover penalty.
6. **`validator.py`**: Independently certifies candidate allocations against 6 non-negotiable safety gates before human presentation.
7. **`risk_attribution.py`**: Executes Euler's risk decomposition to produce Marginal Risk Contribution ($\text{MCR}_i$) and Percentage Risk Contribution ($\text{PRC}_i$) for each asset.
8. **`scenario_engine.py`**: Applies macro scenario shock vectors, computes post-shock loss and re-normalized weights, runs the control engine, triggers the optimizer, and constructs the rebalance proposal.
9. **`reverse_stress.py`**: Sweeps shock multipliers $\alpha \in [0.02, 0.50]$ backwards to identify the failure boundary $\alpha^*$ where Risk Score reaches 80.0, computing Distance to Failure (DtF) and Resilience Score.
10. **`rebalancer.py`**: Processes human approval or rejection, commits updated holding weights/values to the database, logs `RebalanceAction`, and returns before/after comparisons.
11. **`regime_service.py`**: Evaluates market conditions and classifies active regime into `CALM`, `TRANSITIONAL`, or `CRISIS`.
12. **`contagion_service.py`**: Computes baseline vs stressed cross-asset correlation matrices and contagion expansion indices.
13. **`prediction_service.py`**: Computes EWMA volatility forecasts ($\lambda=0.94$), 5-day breach probabilities, and drawdown confidence intervals.
14. **`learning_service.py`**: Tracks post-rebalance 5-day simulated performance to measure capital preserved and volatility reduction.

### 4.3 Pluggable Market Data Architecture (`app/services/market_data/`)
- **`base.py` (`MarketDataProvider`)**: Standardized interface for market data sources.
- **`demo_provider.py` (`DemoMarketDataProvider`)**: Generates 250-day correlated geometric Brownian motion asset prices with realistic correlation structure.
- **`csv_provider.py` (`CsvMarketDataProvider`)**: Ingests external CSV prices (Date, Equity, Bonds, Gold, Cash), validates data types, and persists prices to the database.
- **`live_provider.py` (`LiveMarketDataProvider`)**: Extensible adapter for live institutional WebSocket or REST feeds.
- **`manager.py` (`MarketDataProviderManager`)**: Manages the runtime active provider without restarting the server.

### 4.4 Intelligence, Policy RAG & AI Copilot Subsystem
- **`document_service.py`**: Parses, cleans, and chunks institutional compliance policies (`.md`, `.txt`, `.pdf`, `.docx`) into semantic text segments with metadata.
- **`rag_service.py`**: In-memory TF-IDF vectorizer with cosine similarity scoring. Searches indexed policy chunks for regulatory guidance matching queries.
- **`copilot_service.py`**: Institutional AI risk copilot router:
  1. Classifies user query intent (`GREETING`, `CAPABILITIES`, `CAPITAL`, `PORTFOLIO_SUMMARY`, `RISK_EXPLANATION`, `OPTIMIZER_EXPLANATION`, `POLICY_RAG`, `STRESS_REVERSE`, `GENERAL`).
  2. Extracts screen context and active portfolio metrics.
  3. Executes relevant tool calls (RAG search, reverse stress, attribution).
  4. Calls `llm_service.py` (Groq API) with strict system prompts prohibiting trading speculation.
  5. If Groq API key is absent or fails, falls back gracefully to `_deterministic_fiduciary_response` ensuring 100% uptime and testability.
- **`llm_service.py`**: Asynchronous Groq client utilizing `llama-3.3-70b-versatile` with low temperature ($0.2$) for disciplined fiduciary output.
- **`llm_explanation.py`**: Translates structured JSON solver outputs into executive boardroom summaries.

---

## 5. Database Architecture & Schema

The platform supports both **PostgreSQL 16** (production / docker) and **SQLite 3** (local zero-configuration development). Dual compatibility is managed seamlessly via SQLAlchemy 2.0.

### 5.1 Entity Relationship Diagram
```text
 ┌───────────────┐        ┌───────────────┐        ┌──────────────────┐
 │    assets     │◄───────┤   holdings    │───────►│    portfolios    │
 └───────┬───────┘        └───────────────┘        └────────┬─────────┘
         │                                                  │
         │                ┌───────────────┐                 ├──────────────────────────┐
         ├───────────────►│ market_prices │                 │                          │
         │                └───────────────┘                 ▼                          ▼
         │                                       ┌────────────────────┐      ┌──────────────────┐
         │        ┌───────────────────────┐      │   risk_snapshots   │      │ optimization_runs│
         ├───────►│    scenario_shocks    │      └────────────────────┘      └────────┬─────────┘
         │        └───────────▲───────────┘                                           │
         │                    │                                                       ▼
         │        ┌───────────┴───────────┐      ┌────────────────────┐      ┌──────────────────┐
         │        │       scenarios       │      │ rebalance_actions  │◄─────┤   optimization   │
         │        └───────────────────────┘      └────────────────────┘      │   allocations    │
         │                                                                   └──────────────────┘
         │        ┌───────────────────────┐
         └───────►│        alerts         │
                  └───────────────────────┘
```

### 5.2 Table Schemas
1. **`assets`**: Investment instruments (`id`, `symbol`, `name`, `category`, `expected_return`, `volatility`, `liquidity_score`, `min_weight`, `max_weight`).
2. **`portfolios`**: Managed capital fund (`id`, `name`, `total_capital`, `risk_aversion`, `created_at`, `updated_at`).
3. **`holdings`**: Active composition (`id`, `portfolio_id`, `asset_id`, `weight`, `market_value`, `updated_at`).
4. **`market_prices`**: Historical daily OHLC data (`id`, `asset_id`, `price_date`, `open_price`, `high_price`, `low_price`, `close_price`, `volume`).
5. **`risk_snapshots`**: Immutable audit logs of risk computations (`id`, `portfolio_id`, `risk_score`, `risk_level`, `expected_return`, `volatility`, `max_drawdown`, `liquidity_ratio`, `concentration`, `market_stress`, `created_at`).
6. **`optimization_runs`**: CVXPY solver audit records (`id`, `portfolio_id`, `risk_level`, `risk_aversion`, `expected_return_before`, `volatility_before`, `expected_return_after`, `volatility_after`, `transaction_cost`, `status`, `created_at`).
7. **`optimization_allocations`**: Transition weights per run (`id`, `optimization_id`, `asset_id`, `old_weight`, `new_weight`).
8. **`scenarios`**: Macro scenario definitions (`id`, `name`, `description`, `created_at`).
9. **`scenario_shocks`**: Asset shock multipliers (`id`, `scenario_id`, `asset_id`, `shock_percentage`).
10. **`alerts`**: Limit breach notifications (`id`, `portfolio_id`, `risk_level`, `metric`, `threshold_value`, `actual_value`, `message`, `created_at`).
11. **`rebalance_actions`**: Governance record of human decisions (`id`, `portfolio_id`, `optimization_id`, `action`, `approved`, `transaction_cost`, `risk_before`, `risk_after`, `reason`, `created_at`).

### 5.3 Audit Immutability Principles
- **Append-Only Ledgers:** `risk_snapshots`, `optimization_runs`, `optimization_allocations`, and `rebalance_actions` are strictly append-only.
- **Historical Reconstructibility:** Any past portfolio state can be perfectly reconstructed from `holdings` and historical `optimization_allocations`.
- **Foreign Key Constraints:** Cascade deletion is disabled on audit tables to prevent accidental history erasure.

---

## 6. Risk, Control & Quantitative Models

### 6.1 Composite Risk Score Formulation
The composite risk score $S_{\text{risk}} \in [0, 100]$ is a weighted linear combination of 5 normalized risk dimensions:

$$S_{\text{risk}} = 0.30 \cdot S_{\text{vol}} + 0.25 \cdot S_{\text{dd}} + 0.20 \cdot S_{\text{conc}} + 0.15 \cdot S_{\text{liq}} + 0.10 \cdot S_{\text{stress}}$$

- **Volatility Score ($S_{\text{vol}}$):** $\min\left(\frac{\sigma_p}{0.30}, 1.0\right) \times 100$ where $\sigma_p = \sqrt{w^T \Sigma w}$.
- **Drawdown Score ($S_{\text{dd}}$):** $\min\left(\frac{\text{MDD}}{0.20}, 1.0\right) \times 100$.
- **Concentration Score ($S_{\text{conc}}$):** $\max\left(\frac{\text{HHI} - 0.20}{0.80}, 0.0\right) \times 100$ where $\text{HHI} = \sum w_i^2$.
- **Liquidity Score ($S_{\text{liq}}$):** $(1.0 - L) \times 100$ where $L = \sum w_i \ell_i$.
- **Market Stress Score ($S_{\text{stress}}$):** $\min\left(\max\left(\frac{\sigma_p}{\sigma_{\text{hist}}} - 1.0, 0.0\right), 1.0\right) \times 100$.

### 6.2 Tail Risk Metrics (VaR & CVaR)
- **Parametric 95% Value at Risk:** $\text{VaR}_{95} = -(\mu_p - 1.645 \cdot \sigma_p)$ (daily loss threshold).
- **Parametric 95% Conditional Value at Risk:** $\text{CVaR}_{95} = -\mu_p + 2.0627 \cdot \sigma_p$ (expected shortfall).

### 6.3 Safe Operating Envelope & Hysteresis
| Zone | Score Range | Max Equity | Min Cash | Max Volatility | Operating Stance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GREEN (Safe)** | $0 \le S < 30$ | $\le 50\%$ | $\ge 5\%$ | $\le 15\%$ | `HOLD` |
| **YELLOW (Caution)** | $30 \le S < 60$ | $\le 45\%$ | $\ge 10\%$ | $\le 14\%$ | `ADVISORY` |
| **ORANGE (Warning)** | $60 \le S < 80$ | $\le 35\%$ | $\ge 15\%$ | $\le 12\%$ | `REBALANCE` |
| **RED (Crisis)** | $80 \le S \le 100$ | $\le 20\%$ | $\ge 20\%$ | $\le 10\%$ | `CRISIS_PROTECTION` |

**Anti-Chattering Hysteresis:** De-escalation back to a safer zone requires clearing an asymmetric buffer $\delta = 3.0$ (e.g., exiting YELLOW to GREEN requires $S \le 27.0$).

### 6.4 Minimum-Intervention Optimization Problem
$$\min_{w \in \mathbb{R}^N} \quad \frac{1}{2} \|w - w_0\|_2^2 + \gamma \sum_{i=1}^N |w_i - w_{0,i}| + \lambda w^T \Sigma w - \kappa w^T \mu$$

Subject to:
- $\sum_{i=1}^N w_i = 1.0$ (Full investment)
- $w_i \ge 0 \quad \forall i$ (Long-only)
- $w_{\text{equity}} \le \text{MaxEquity}_{\text{zone}}$
- $w_{\text{cash}} \ge \text{MinCash}_{\text{zone}}$
- $w_i^{\min} \le w_i \le w_i^{\max} \quad \forall i$

### 6.5 Independent Safety Gates (`validator.py`)
1. **Budget Invariant:** $|\sum w_i - 1.0| \le 10^{-4}$
2. **Non-Negative Invariant:** $w_i \ge -10^{-6} \quad \forall i$
3. **Dynamic Equity Cap:** $w_{\text{equity}} \le \text{MaxEquity}_{\text{zone}} + 10^{-4}$
4. **Dynamic Cash Floor:** $w_{\text{cash}} \ge \text{MinCash}_{\text{zone}} - 10^{-4}$
5. **Concentration Ceiling:** $\max_i(w_i) \le 0.50 + 10^{-4}$
6. **Volatility Ceiling:** $\sqrt{w^T \Sigma w} \le \sigma_{\max,\text{zone}} + 10^{-4}$

### 6.6 Euler Risk Decomposition
$$\text{MCR}_i = \frac{\partial \sigma_p}{\partial w_i} = \frac{(\Sigma w)_i}{\sigma_p}, \quad \text{ARC}_i = w_i \cdot \text{MCR}_i, \quad \text{PRC}_i = \frac{\text{ARC}_i}{\sigma_p}$$
Euler's theorem guarantees $\sum_{i=1}^N \text{ARC}_i = \sigma_p$ and $\sum_{i=1}^N \text{PRC}_i = 100\%$.

### 6.7 Reverse Stress Testing & Distance to Failure
Given stress shock vector $\mathbf{s} \in \mathbb{R}^N$ and shock multiplier $\alpha \ge 0$:
$$V_i(\alpha) = w_i^0 \cdot V_{\text{portfolio}} \cdot (1 + \alpha \cdot s_i), \quad w_i(\alpha) = \frac{V_i(\alpha)}{\sum V_j(\alpha)}$$
$$\alpha^* = \inf \left\{ \alpha \in [0.02, 0.50] \mid S_{\text{risk}}(w(\alpha)) \ge 80.0 \right\}$$
- **Distance to Failure (DtF):** $\text{DtF} = \alpha^*$
- **Resilience Score:** $\min\left(\frac{\text{DtF}}{0.30}, 1.0\right) \times 100$

---

## 7. Complete REST API Reference

All endpoints are hosted at `/api` and interactively documented at `http://localhost:8000/docs`.

| Method | Path | Summary | Key Payload / Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service & DB liveness probe | `{"status": "ok", "database": "connected"}` |
| `GET` | `/api/state/master` | Unified single-call institutional master state | Returns complete state: portfolio, risk, regime, contagion, prediction, outcomes, provider |
| `GET` | `/api/portfolio` | Active portfolio holdings & capital | `Portfolio` object with holdings array |
| `POST` | `/api/portfolio/update` | Update capital or asset weights | `{"total_capital": 12000000, "weights": {...}}` |
| `POST` | `/api/portfolio/reset` | Reset portfolio to default ₹1 Cr baseline | Resets holdings to balanced seed |
| `GET` | `/api/risk` | Calculate risk & persist snapshot | Returns 8 risk metrics, score, level, envelope, VaR |
| `GET` | `/api/risk/attribution` | Euler marginal risk breakdown | Returns `MCR`, `ARC`, `PRC`, primary risk driver |
| `GET` | `/api/scenarios` | List available stress scenarios | Array of scenarios with shock vectors |
| `POST` | `/api/scenarios/run` | Execute forward stress simulation | `{"scenario_id": "uuid"}` $\to$ returns full before/after diff and optimization proposal |
| `POST` | `/api/stress/reverse` | Reverse stress sweep & DtF | `{"failure_threshold_score": 80.0}` $\to$ returns $\alpha^*$, DtF, curve |
| `POST` | `/api/optimize` | Standalone CVXPY optimization | `{"risk_aversion": 1.0}` $\to$ solver weights |
| `GET` | `/api/optimization` | List recent optimization runs | Array of `OptimizationRun` records |
| `POST` | `/api/rebalance` | Human approval or rejection | `{"optimization_id": "uuid", "approved": true}` |
| `GET` | `/api/rebalance/history`| Chronological rebalance audit log | Array of `RebalanceAction` records |
| `GET` | `/api/market/regime` | Market regime detection | `{"regime": "CALM", "confidence": 0.85}` |
| `GET` | `/api/market/contagion` | Correlation contagion matrices | Normal vs stressed correlation heatmaps |
| `GET` | `/api/market/provider` | Active market feed status | Demo / CSV / Live status |
| `POST` | `/api/market/provider` | Switch active market provider | `{"provider": "demo" \| "csv" \| "live"}` |
| `POST` | `/api/market/upload-csv`| Ingest external OHLC price CSV | Multipart file upload $\to$ DB price ingestion |
| `GET` | `/api/market/history` | Historical price returns | Returns daily price series |
| `POST` | `/api/rag/query` | RAG semantic policy search | `{"query": "drawdown limit", "top_k": 3}` |
| `GET` | `/api/documents` | List indexed policy documents | Document chunk counts and metadata |
| `POST` | `/api/documents/upload`| Upload policy document (PDF/DOCX/MD) | Multipart upload $\to$ automated chunking & index |
| `DELETE`| `/api/documents/{id}` | Remove document from RAG index | Deletion confirmation |
| `POST` | `/api/risk-manager/chat`| AI Copilot conversational chat | `{"query": "...", "screen_context": "..."}` |
| `GET` | `/api/copilot/context` | Raw Copilot context payload | Formatted context string passed to LLM |
| `GET` | `/api/audit/outcomes` | 5-day simulated outcome tracking | Verified capital preserved, loss avoided |

---

## 8. Configuration & Environment Setup

### 8.1 Environment Variables
All variables have production-grade fallbacks defined in `backend/app/config.py`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///./opti_capital.db` | Database connection string. Use `postgresql://user:pass@localhost:5432/opti_capital` for PostgreSQL. |
| `GROQ_API_KEY` | `""` (Empty string) | Optional Groq API key for Llama-3.3-70B. If omitted, the deterministic fiduciary fallback handles all Copilot queries. |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Groq LLM model name. |
| `MARKET_DATA_PROVIDER` | `demo` | Default active market provider (`demo`, `csv`, `live`). |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed CORS origins for FastAPI. |

### 8.2 Zero-Config Local Setup (Native)

#### 1. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Seed database with demo data (idempotent, creates opti_capital.db)
python -m app.seed.seed_database

# Run full test suite (97 tests)
python -m pytest tests/ -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Verify production build
npm run build

# Start Vite development server
npm run dev
```
Open `http://localhost:5173`.

### 8.3 Docker Compose Setup
```bash
# Launch multi-container stack (Postgres, Backend, Frontend)
docker compose up -d

# Seed PostgreSQL database
docker compose exec backend python -m app.seed.seed_database
```

---

## 9. Verification & Testing

The repository features comprehensive automated test coverage verifying quantitative invariants, API contracts, optimizer boundaries, and AI fallbacks.

```bash
cd backend
venv\Scripts\python -m pytest tests/ -v
```

**Results:** `97 passed in 20.43s` across 15 test suites:
- `test_quant_risk.py`: Value-at-Risk, CVaR, HHI, and volatility invariants.
- `test_risk.py`: Clamping $[0, 100]$, score monotonic scaling, risk level boundaries.
- `test_controls.py`: Safe Operating Envelope zones, asymmetric hysteresis.
- `test_optimizer.py`: Budget sum $= 1.0$, long-only $w_i \ge 0$, turnover penalty, tracking error.
- `test_validator.py`: Independent validation safety gates (6 tests).
- `test_scenarios.py`: Macro crash loss magnitude, post-shock weight normalization.
- `test_stress_chain.py`: End-to-end stress-to-rebalance-to-audit pipeline.
- `test_rebalance.py`: Holdings update in database, `RebalanceAction` persistence.
- `test_e2e_aegis.py`: Complete institutional MVP lifecycle, Euler attribution, reverse stress.
- `test_master_state_api.py`: Verification of `/api/state/master` unified contract.
- `test_master_system.py`: Regime classification, correlation contagion, RAG retrieval.
- `test_market_data.py`: Demo provider, CSV provider, and provider manager.
- `test_prediction_service.py`: EWMA forecasting, breach probabilities, drawdown CI.
- `test_document_rag.py`: Document ingestion, TF-IDF cosine ranking, policy retrieval.
- `test_copilot_institutional.py`: Intent classification, fiduciary synthesis, screen awareness.

---

## 10. Known Limitations & Institutional Roadmap

1. **Brokerage Execution:** AEGIS generates certified rebalance proposals for human approval. It does not route FIX messages to live brokers (by design for hackathon evaluation and risk governance).
2. **Market Feeds:** The platform ships with synthetic demo data and CSV upload. The `LiveMarketDataProvider` is implemented as an extensible interface stub ready for Bloomberg B-PIPE or Refinitiv Elektron integration.
3. **RAG Vector Storage:** The RAG system uses an in-memory TF-IDF vectorizer suited for institutional policy collections (<1,000 pages). A vector database like pgvector or Qdrant can be plugged in for multi-million document corpora.
4. **Multi-Portfolio Support:** The database schema natively supports multiple institutional funds; the frontend UI currently focuses on the primary Balanced Fund (₹1.00 Cr) for presentation clarity.
