# AEGIS API Specification & REST Contracts

Base URL: `http://localhost:8000/api`  
Interactive OpenAPI Documentation: `http://localhost:8000/docs`  
Interactive ReDoc Documentation: `http://localhost:8000/redoc`  

---

## 1. Core Endpoints Overview

| Method | Endpoint | Status | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | **Operational** | Health check & database connection probe |
| `GET` | `/portfolio` | **Operational** | Current portfolio state, valuation, cash, and holdings |
| `GET` | `/risk` | **Operational** | Real-time risk assessment & snapshot persistence |
| `GET` | `/risk/attribution` | **Planned (P1)** | Asset-level marginal risk contributions ($MCAR_i$) |
| `GET` | `/scenarios` | **Operational** | List available stress scenarios and asset shock vectors |
| `POST` | `/scenarios/run` | **Operational** | Execute forward scenario simulation & control pipeline |
| `POST` | `/stress/reverse` | **Planned (P1)** | Execute reverse stress sweep and compute Distance to Failure |
| `POST` | `/optimize` | **Operational** | Standalone CVXPY minimum-intervention optimizer |
| `GET` | `/optimization` | **Operational** | List recent optimization runs and solver results |
| `POST` | `/validate` | **Planned (P0)** | Independently validate candidate portfolio weights |
| `POST` | `/rebalance` | **Operational** | Human approval or rejection of recommended rebalance |
| `GET` | `/rebalance/history` | **Operational** | Chronological audit trail of rebalance events |

---

## 2. Detailed Endpoint Specifications

### 2.1 GET `/health`
Returns service and PostgreSQL database connectivity status.
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

### 2.2 GET `/portfolio`
Returns current portfolio metadata, total capital, and asset-level holdings.
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
      "weight": 0.45,
      "market_value": 4500000.00
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

### 2.3 GET `/risk`
Calculates active portfolio risk metrics, saves an immutable `risk_snapshots` record, and returns composite score and operating mode.
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
    "risk_level": "SAFE"
  },
  "snapshot_id": "snapshot-uuid"
}
```

---

### 2.4 GET `/risk/attribution` [Planned P1]
Calculates Euler's marginal risk contribution breakdown per asset to explain risk origins.
- **Response `200 OK`**:
```json
{
  "portfolio_volatility": 0.1142,
  "risk_attributions": [
    {
      "symbol": "EQUITY",
      "name": "Equity",
      "weight": 0.45,
      "marginal_risk_contribution": 0.1980,
      "absolute_risk_contribution": 0.0891,
      "percentage_risk_contribution": 0.7802,
      "is_primary_risk_driver": true
    },
    {
      "symbol": "GOV_BONDS",
      "name": "Government Bonds",
      "weight": 0.25,
      "marginal_risk_contribution": 0.0320,
      "absolute_risk_contribution": 0.0080,
      "percentage_risk_contribution": 0.0701,
      "is_primary_risk_driver": false
    }
  ]
}
```

---

### 2.5 GET `/scenarios`
Lists available stress testing scenarios and their asset shock vectors.
- **Response `200 OK`**:
```json
[
  {
    "id": "scenario-crash-uuid",
    "name": "Market Crash",
    "description": "Severe equity decline with flight to safety.",
    "shocks": [
      { "asset_symbol": "EQUITY", "asset_name": "Equity", "shock_percentage": -0.30 },
      { "asset_symbol": "GOV_BONDS", "asset_name": "Government Bonds", "shock_percentage": -0.05 },
      { "asset_symbol": "CORP_BONDS", "asset_name": "Corporate Bonds", "shock_percentage": -0.10 },
      { "asset_symbol": "GOLD", "asset_name": "Gold", "shock_percentage": 0.12 },
      { "asset_symbol": "CASH", "asset_name": "Cash", "shock_percentage": 0.00 }
    ]
  }
]
```

---

### 2.6 POST `/scenarios/run`
Primary simulation endpoint. Executes forward shock $\to$ stressed risk $\to$ dynamic envelope controls $\to$ CVXPY optimization $\to$ transaction cost $\to$ candidate allocation.
- **Request Body**:
```json
{
  "scenario_id": "scenario-crash-uuid"
}
```
- **Response `200 OK`**:
```json
{
  "scenario": {
    "id": "scenario-crash-uuid",
    "name": "Market Crash",
    "description": "Severe equity decline with flight to safety."
  },
  "before": {
    "portfolio_value": 10000000.00,
    "risk_score": 24.2,
    "risk_level": "SAFE",
    "volatility": 0.1142,
    "drawdown": 0.0520,
    "liquidity": 0.8925
  },
  "shock": {
    "details": {
      "equity": -0.30,
      "gov_bonds": -0.05,
      "corp_bonds": -0.10,
      "gold": 0.12,
      "cash": 0.00
    },
    "portfolio_loss": -0.1505,
    "portfolio_value_after": 8495000.00
  },
  "after_shock": {
    "risk_score": 84.6,
    "risk_level": "CRISIS",
    "volatility": 0.2340,
    "drawdown": 0.1505,
    "liquidity": 0.8400
  },
  "control": {
    "mode": "CRISIS",
    "breaches": [
      "Portfolio volatility (23.4%) exceeded configured limit (15.0%).",
      "Maximum drawdown (15.1%) exceeded configured limit (10.0%)."
    ],
    "constraints": {
      "max_equity": 0.20,
      "min_cash": 0.20,
      "max_volatility": 0.10,
      "max_drawdown": 0.05
    }
  },
  "recommendation": {
    "action": "CRISIS_PROTECTION",
    "optimization_id": "opt-run-uuid",
    "allocation": {
      "equity": 0.2000,
      "gov_bonds": 0.3500,
      "corp_bonds": 0.1500,
      "gold": 0.1000,
      "cash": 0.2000
    },
    "transaction_cost": 3520.50,
    "turnover": 0.1850,
    "risk_before": 84.6,
    "risk_after": 26.1,
    "explanation": "Portfolio risk level: CRISIS (score: 84.6/100). Threshold breaches detected: Portfolio volatility exceeded limit. Equity reduced from 38% to 20%. Cash increased from 6% to 20%."
  }
}
```

---

### 2.7 POST `/stress/reverse` [Planned P1]
Executes deterministic shock sweep over shock intensity $\alpha$ to find the failure threshold where Risk Score $\ge 80$.
- **Request Body**:
```json
{
  "failure_threshold_score": 80.0
}
```
- **Response `200 OK`**:
```json
{
  "status": "VULNERABLE",
  "distance_to_failure": 0.0820,
  "distance_to_failure_pct": "8.2%",
  "critical_shock_multiplier": 0.082,
  "failure_risk_score": 80.4,
  "resilience_score": 27.3,
  "sweep_points": [
    { "alpha": 0.02, "score": 38.5 },
    { "alpha": 0.04, "score": 52.1 },
    { "alpha": 0.06, "score": 68.3 },
    { "alpha": 0.08, "score": 79.4 },
    { "alpha": 0.082, "score": 80.4 }
  ]
}
```

---

### 2.8 POST `/validate` [Planned P0]
Independently validates a candidate allocation vector before presentation or execution.
- **Request Body**:
```json
{
  "weights": {
    "equity": 0.20,
    "gov_bonds": 0.35,
    "corp_bonds": 0.15,
    "gold": 0.10,
    "cash": 0.20
  }
}
```
- **Response `200 OK`**:
```json
{
  "status": "PASS",
  "is_valid": true,
  "checks": [
    { "check": "BUDGET_SUM_EQUALS_ONE", "passed": true, "value": 1.0000 },
    { "check": "NO_SHORTING_LONG_ONLY", "passed": true, "value": "min=0.10" },
    { "check": "EQUITY_UPPER_BOUND", "passed": true, "value": 0.20, "limit": 0.20 },
    { "check": "CASH_LOWER_BOUND", "passed": true, "value": 0.20, "limit": 0.20 },
    { "check": "VOLATILITY_CEILING", "passed": true, "value": 0.098, "limit": 0.10 }
  ],
  "violations": []
}
```

---

### 2.9 POST `/rebalance`
Approve or reject a generated rebalance recommendation. Approving updates simulated holdings in PostgreSQL.
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
  "status": "approved",
  "portfolio_id": "portfolio-uuid",
  "optimization_id": "opt-run-uuid",
  "message": "Holdings updated successfully. Rebalance approved."
}
```

---

### 2.10 GET `/rebalance/history`
Returns chronological audit log of rebalance decisions.
- **Response `200 OK`**:
```json
[
  {
    "id": "rebalance-uuid",
    "action": "CRISIS_PROTECTION",
    "approved": true,
    "transaction_cost": 3520.50,
    "risk_before": 84.6,
    "risk_after": 26.1,
    "reason": "Holdings updated to defensive weights under market crash.",
    "created_at": "2025-01-01T12:05:00Z"
  }
]
```
