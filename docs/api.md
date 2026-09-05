# AEGIS API Specification & REST Contracts

**Base URL:** `http://localhost:8000/api`  
**Interactive OpenAPI Swagger:** `http://localhost:8000/docs`  
**Interactive ReDoc:** `http://localhost:8000/redoc`  
**Authentication:** Open local simulation interface (no auth tokens required for hackathon environment).

---

## 1. Complete Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health check & database connection probe |
| `GET` | `/state/master` | Unified single-call institutional master state payload |
| `GET` | `/portfolio` | Current portfolio valuation, cash, and holdings |
| `POST` | `/portfolio/update` | Dynamically update capital or asset allocation weights |
| `POST` | `/portfolio/reset` | Reset portfolio holdings to balanced ₹1 Cr baseline |
| `GET` | `/risk` | Real-time risk assessment & snapshot persistence |
| `GET` | `/risk/attribution` | Euler marginal & percentage risk contribution per asset |
| `GET` | `/scenarios` | List available stress scenarios and asset shock vectors |
| `POST` | `/scenarios/run` | Execute forward scenario simulation & control pipeline |
| `POST` | `/stress/reverse` | Execute reverse stress sweep & compute Distance to Failure |
| `POST` | `/optimize` | Standalone CVXPY minimum-intervention optimizer |
| `GET` | `/optimization` | List recent optimization runs and solver results |
| `POST` | `/rebalance` | Human approval or rejection of recommended rebalance |
| `GET` | `/rebalance/history` | Chronological audit trail of rebalance events |
| `GET` | `/market/regime` | Market regime detection (Calm, Stressed, Transition) |
| `GET` | `/market/contagion` | Normal vs stressed cross-asset correlation matrices |
| `GET` | `/market/provider` | Active market data feed provider status |
| `POST` | `/market/provider` | Switch active market provider (`demo`, `csv`, `live`) |
| `POST` | `/market/upload-csv` | Upload custom OHLC price CSV with DB persistence |
| `GET` | `/market/history` | Historical price returns and volatility data |
| `POST` | `/rag/query` | RAG semantic policy search across compliance documents |
| `POST` | `/rag/search` | Alias for policy search with top-k filtering |
| `GET` | `/documents` | List indexed policy documents and chunk counts |
| `POST` | `/documents/upload` | Ingest regulatory document (PDF, DOCX, MD) into RAG index |
| `DELETE`| `/documents/{doc_id}` | Remove document from active RAG index |
| `POST` | `/risk-manager/chat` | AI Copilot conversational chat with screen context |
| `POST` | `/copilot/chat` | Alias for Copilot chat endpoint |
| `GET` | `/copilot/context` | Raw Copilot context string payload passed to LLM |
| `GET` | `/audit/outcomes` | 5-day forward simulated decision outcome surveillance |

---

## 2. Core System Endpoints

### 2.1 GET `/health`
Returns service and database connectivity status.
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

### 2.2 GET `/state/master`
Unified institutional contract delivering all system state in a single non-blocking call. Used by the frontend on initial load.
- **Response `200 OK`**:
```json
{
  "timestamp": "2025-03-05T14:00:00Z",
  "portfolio": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Institutional Balanced Fund",
    "total_capital": 10000000.00,
    "holdings": [...]
  },
  "risk": {
    "metrics": {
      "expected_return": 0.0865,
      "volatility": 0.1142,
      "max_drawdown": 0.0520,
      "liquidity_ratio": 0.8925,
      "concentration": 0.2975,
      "market_stress": 0.0000,
      "risk_score": 24.2,
      "risk_level": "SAFE",
      "risk_status": "NORMAL",
      "operating_envelope": "SAFE",
      "intervention_required": false,
      "var_95": 0.0101,
      "cvar_95": 0.0148
    },
    "snapshot_id": "snapshot-uuid"
  },
  "envelope": {
    "risk_level": "SAFE",
    "operating_mode": "SAFE",
    "max_equity": 0.50,
    "min_cash": 0.05,
    "max_volatility": 0.15,
    "max_drawdown": 0.10,
    "intervention_required": false,
    "breaches": []
  },
  "market_regime": {
    "regime": "CALM",
    "confidence": 0.88,
    "volatility_ratio": 0.92
  },
  "contagion": {
    "normal_correlations": {...},
    "stressed_correlations": {...},
    "contagion_index": 0.12
  },
  "predictive": {
    "ewma_volatility": 0.112,
    "breach_probability_5d": 0.04,
    "drawdown_ci_lower": 0.03,
    "drawdown_ci_upper": 0.08
  },
  "provider_status": {
    "active_provider": "demo",
    "available_providers": ["demo", "csv", "live"]
  },
  "recent_outcomes": [...]
}
```

---

## 3. Portfolio Endpoints

### 3.1 GET `/portfolio`
Returns portfolio metadata, capital, and active asset holdings.
- **Response `200 OK`**:
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Institutional Balanced Fund",
  "total_capital": 10000000.00,
  "risk_aversion": 1.0,
  "holdings": [
    {
      "id": "holding-uuid-1",
      "asset_id": "asset-uuid-equity",
      "asset": {
        "id": "asset-uuid-equity",
        "symbol": "EQUITY",
        "name": "Equity",
        "category": "EQUITY",
        "expected_return": 0.12,
        "volatility": 0.22,
        "liquidity_score": 0.90,
        "min_weight": 0.0,
        "max_weight": 0.50
      },
      "weight": 0.38,
      "market_value": 3800000.00
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

### 3.2 POST `/portfolio/update`
Allows dynamic adjustment of portfolio capital or asset allocation weights.
- **Request Body**:
```json
{
  "total_capital": 12500000.00,
  "weights": {
    "EQUITY": 0.35,
    "GOV_BONDS": 0.25,
    "CORP_BONDS": 0.15,
    "GOLD": 0.15,
    "CASH": 0.10
  }
}
```
- **Response `200 OK`**: Updated `Portfolio` object.

---

### 3.3 POST `/portfolio/reset`
Resets the portfolio holdings and capital back to default balanced baseline (₹1.00 Cr).
- **Response `200 OK`**:
```json
{
  "status": "success",
  "message": "Portfolio reset to default allocation",
  "portfolio": {...}
}
```

---

## 4. Quantitative Risk Endpoints

### 4.1 GET `/risk`
Calculates active portfolio risk metrics, saves an immutable `risk_snapshots` record, and evaluates envelope bounds.
- **Response `200 OK`**:
```json
{
  "metrics": {
    "expected_return": 0.0865,
    "volatility": 0.1142,
    "max_drawdown": 0.0520,
    "liquidity_ratio": 0.8925,
    "concentration": 0.2975,
    "market_stress": 0.0000,
    "risk_score": 24.2,
    "risk_level": "SAFE",
    "risk_status": "NORMAL",
    "operating_envelope": "SAFE",
    "intervention_required": false,
    "var_95": 0.0101,
    "cvar_95": 0.0148
  },
  "snapshot_id": "snapshot-uuid"
}
```

---

### 4.2 GET `/risk/attribution`
Calculates Euler's marginal risk contribution breakdown per asset to pinpoint the primary risk driver.
- **Response `200 OK`**:
```json
{
  "portfolio_volatility": 0.1142,
  "primary_risk_driver": "EQUITY",
  "attributions": [
    {
      "symbol": "EQUITY",
      "name": "Equity",
      "capital_weight": 0.38,
      "marginal_contribution": 0.1850,
      "absolute_contribution": 0.0703,
      "percentage_contribution": 0.6155,
      "risk_concentration_ratio": 1.62
    },
    {
      "symbol": "GOV_BONDS",
      "name": "Government Bonds",
      "capital_weight": 0.25,
      "marginal_contribution": 0.0420,
      "absolute_contribution": 0.0105,
      "percentage_contribution": 0.0919,
      "risk_concentration_ratio": 0.37
    }
  ]
}
```

---

## 5. Scenario & Stress Testing Endpoints

### 5.1 GET `/scenarios`
Lists available macroeconomic stress scenarios and their per-asset shock vectors.
- **Response `200 OK`**: Array of scenario objects (`Market Crash`, `High Inflation`, `Tech Shock`, `Normal Market`).

---

### 5.2 POST `/scenarios/run`
Executes forward scenario simulation: applies asset shocks $\to$ recomputes stressed risk $\to$ runs control engine $\to$ runs CVXPY optimizer $\to$ verifies via Independent Validator $\to$ returns rebalance proposal.
- **Request Body**:
```json
{
  "scenario_id": "scenario-uuid-market-crash"
}
```
- **Response `200 OK`**:
```json
{
  "scenario": { "name": "Market Crash", "description": "Severe equity sell-off" },
  "before": { "total_capital": 10000000.0, "risk_score": 24.2, "risk_level": "SAFE" },
  "shock": { "total_loss": 1420000.0, "loss_percentage": 0.142 },
  "after_shock": {
    "total_capital": 8580000.0,
    "risk_score": 84.6,
    "risk_level": "CRISIS",
    "volatility": 0.2340
  },
  "control": {
    "action": "CRISIS_PROTECTION",
    "breaches": ["Volatility (23.4%) exceeds ceiling (15.0%)", "Cash (6.1%) below floor (10.0%)"],
    "constraints": { "max_equity": 0.20, "min_cash": 0.20, "max_volatility": 0.10 }
  },
  "recommendation": {
    "optimization_id": "opt-run-uuid",
    "action": "CRISIS_PROTECTION",
    "proposed_weights": { "EQUITY": 0.20, "GOV_BONDS": 0.25, "CORP_BONDS": 0.15, "GOLD": 0.20, "CASH": 0.20 },
    "turnover": 0.185,
    "transaction_cost": 3520.0,
    "risk_after": 26.1,
    "validator": {
      "status": "PASS",
      "checks": [
        "Budget sum = 1.0000 [PASS]",
        "Long-only constraints satisfied [PASS]",
        "Equity (20.0%) <= Mode Max (20.0%) [PASS]",
        "Cash (20.0%) >= Mode Min (20.0%) [PASS]",
        "Concentration <= 50.0% [PASS]",
        "Volatility <= 10.0% [PASS]"
      ],
      "violations": []
    },
    "explanation": "CRISIS_PROTECTION triggered: 2 boundary limit breaches detected..."
  }
}
```

---

### 5.3 POST `/stress/reverse`
Conducts reverse stress testing backward from the failure threshold to calculate Distance to Failure (DtF).
- **Request Body**:
```json
{
  "failure_threshold_score": 80.0,
  "weights_override": null
}
```
- **Response `200 OK`**:
```json
{
  "failure_threshold_score": 80.0,
  "critical_shock_multiplier": 0.284,
  "distance_to_failure": 0.284,
  "failure_mode": "CRISIS_BOUNDARY_BREACH",
  "capital_resilience_score": 94.67,
  "is_currently_failed": false,
  "shock_progression": [
    { "multiplier": 0.05, "portfolio_loss_pct": 0.021, "risk_score": 28.4 },
    { "multiplier": 0.10, "portfolio_loss_pct": 0.043, "risk_score": 42.1 },
    { "multiplier": 0.284, "portfolio_loss_pct": 0.128, "risk_score": 80.0 }
  ]
}
```

---

## 6. Optimizer & Rebalance Endpoints

### 6.1 POST `/optimize`
Runs the standalone CVXPY minimum-intervention quadratic program with custom risk aversion.
- **Request Body**:
```json
{
  "risk_aversion": 1.0
}
```
- **Response `200 OK`**: Solver status, proposed weights, expected return, volatility, turnover, and transaction friction.

---

### 6.2 POST `/rebalance`
Records human risk-officer approval or rejection, updating active portfolio holdings in PostgreSQL/SQLite when approved.
- **Request Body**:
```json
{
  "optimization_id": "opt-run-uuid",
  "approved": true
}
```
- **Response `200 OK`**:
```json
{
  "status": "success",
  "action_id": "action-uuid",
  "approved": true,
  "action": "CRISIS_PROTECTION",
  "message": "Rebalance executed. Holdings updated in database.",
  "before_after": {
    "capital_before": 8580000.0,
    "capital_after": 8576480.0,
    "risk_score_before": 84.6,
    "risk_score_after": 26.1,
    "volatility_before": 0.2340,
    "volatility_after": 0.0980,
    "transaction_cost": 3520.0
  }
}
```

---

### 6.3 GET `/rebalance/history`
Returns chronological audit log of all rebalance recommendations and human decisions.
- **Response `200 OK`**: Array of `RebalanceAction` objects.

---

## 7. Market Data Endpoints

### 7.1 GET `/market/regime`
Returns the active market regime classification and volatility ratios.
- **Response `200 OK`**:
```json
{
  "regime": "CALM",
  "confidence": 0.88,
  "volatility_ratio": 0.92,
  "description": "Historical price volatility within normal band."
}
```

---

### 7.2 GET `/market/contagion`
Returns correlation matrix data contrasting normal conditions against stressed conditions.
- **Query Parameter:** `is_stressed` (boolean, default: false)
- **Response `200 OK`**: Asset correlation matrix and average contagion shift metric.

---

### 7.3 GET `/market/provider`
Returns status of active and available market feed providers.
- **Response `200 OK`**:
```json
{
  "active_provider": "demo",
  "available_providers": ["demo", "csv", "live"],
  "last_updated": "2025-03-05T14:00:00Z"
}
```

---

### 7.4 POST `/market/provider`
Switches the runtime market data provider.
- **Request Body**: `{"provider": "demo" | "csv" | "live"}`
- **Response `200 OK`**: Confirmation of active provider change.

---

### 7.5 POST `/market/upload-csv`
Uploads external OHLC prices CSV (`multipart/form-data`) and persists data to the database.
- **Response `200 OK`**: Ingestion summary with rows parsed and date ranges updated.

---

## 8. Policy RAG & Document Endpoints

### 8.1 POST `/rag/query` (and `/rag/search`)
Queries the semantic policy store using TF-IDF cosine similarity.
- **Request Body**:
```json
{
  "query": "What is the maximum allowed equity exposure during crisis?",
  "top_k": 3
}
```
- **Response `200 OK`**:
```json
[
  {
    "document_id": "doc-ips-01",
    "document_name": "Investment Policy Statement",
    "document_type": "COMPANY_POLICY",
    "chunk_id": "chunk-03",
    "score": 0.842,
    "content": "Under CRISIS operating envelope, maximum equity exposure is clamped to 20.0%..."
  }
]
```

---

### 8.2 GET `/documents`
Lists all indexed policy documents, document types, and chunk counts.

---

### 8.3 POST `/documents/upload`
Uploads a regulatory or corporate policy file (PDF, DOCX, MD) via multipart form data, automatically chunks the text, and updates the RAG index.

---

### 8.4 DELETE `/documents/{doc_id}`
Removes a document and all associated chunks from the active RAG index.

---

## 9. AI Copilot Endpoints

### 9.1 POST `/risk-manager/chat` (and `/copilot/chat`)
Sends a conversational query to the institutional AI Risk Copilot with screen context awareness.
- **Request Body**:
```json
{
  "query": "Why did the system propose increasing cash to 20%?",
  "screen_context": "COMMAND_CENTER",
  "conversation_history": [
    { "role": "user", "content": "What is our current risk score?" },
    { "role": "assistant", "content": "Our current composite risk score is 84.6 (CRISIS)." }
  ]
}
```
- **Response `200 OK`**:
```json
{
  "intent": "OPTIMIZER_EXPLANATION",
  "response": "Under the CRISIS operating envelope triggered by the market shock, the Cash Floor boundary mandates a minimum 20.0% cash allocation to guarantee liquidity...",
  "citations": [
    {
      "source": "Investment Policy Statement §4.2",
      "excerpt": "Mandatory liquidity reserves must increase to 20.0% upon breach of the 80.0 risk boundary."
    }
  ],
  "suggested_actions": ["Review dynamic constraint bounds", "Approve defensive rebalance"]
}
```

---

### 9.2 GET `/copilot/context`
Returns the raw formatted context block that AEGIS constructs and injects into the LLM system prompt.

---

## 10. Audit & Decision Outcomes

### 10.1 GET `/audit/outcomes`
Returns forward 5-day simulated outcome tracking across historical rebalances.
- **Response `200 OK`**:
```json
[
  {
    "action_id": "action-uuid-1",
    "rebalance_date": "2025-03-01T10:00:00Z",
    "portfolio_id": "portfolio-uuid",
    "action": "CRISIS_PROTECTION",
    "approved": true,
    "turnover": 0.185,
    "transaction_cost": 3520.0,
    "risk_score_before": 84.6,
    "risk_score_after": 26.1,
    "verified_capital_preserved": 1250000.0,
    "loss_avoided": 840000.0,
    "volatility_reduction_pct": 0.581,
    "outcome_status": "HIGHLY_EFFECTIVE"
  }
]
```
