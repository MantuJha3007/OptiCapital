/* API types matching backend Pydantic schemas.

   Verified against:
     backend/app/api/portfolio.py, risk.py, scenarios.py,
     optimization.py, rebalance.py
     backend/app/services/scenario_engine.py::run_scenario  */

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: string;
  expected_return: number;
  volatility: number;
  liquidity_score: number;
  min_weight: number;
  max_weight: number;
}

export interface Holding {
  id: string;
  asset_id: string;
  asset: Asset | null;
  weight: number;
  market_value: number;
}

export interface Portfolio {
  id: string;
  name: string;
  total_capital: number;
  risk_aversion: number;
  holdings: Holding[];
  created_at: string;
  updated_at: string;
}

export interface RiskMetrics {
  expected_return: number;
  volatility: number;
  max_drawdown: number;
  liquidity_ratio: number;
  concentration: number;
  market_stress: number;
  risk_score: number;
  risk_level: string;
}

export interface RiskResponse {
  metrics: RiskMetrics;
  snapshot_id: string;
}

export interface ScenarioShock {
  asset_symbol: string;
  asset_name: string;
  shock_percentage: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string | null;
  shocks: ScenarioShock[];
}

export interface ScenarioStateSnapshot {
  risk_score: number;
  risk_level: string;
  volatility: number;
  drawdown: number;
  liquidity: number;
}

export interface ScenarioRunResponse {
  scenario: {
    id: string;
    name: string;
    description: string | null;
  };
  before: ScenarioStateSnapshot & { portfolio_value: number };
  shock: {
    details: Record<string, number>;
    portfolio_loss: number;
    portfolio_value_after: number;
    /** Renormalised weights after the shock — the baseline the
        recommendation, its turnover and its cost are all measured against. */
    weights_after?: Record<string, number>;
  };
  after_shock: ScenarioStateSnapshot;
  control: {
    mode: string;
    breaches: string[];
    constraints: Record<string, number>;
  };
  recommendation: {
    action: string;
    optimization_id: string;
    allocation: Record<string, number>;
    transaction_cost: number;
    turnover: number;
    risk_before: number;
    risk_after: number;
    explanation: string;
  };
}

/* GET /api/rebalance/history */
export interface RebalanceRecord {
  id: string;
  action: string;
  approved: boolean;
  transaction_cost: number | null;
  risk_before: number | null;
  risk_after: number | null;
  reason: string | null;
  created_at: string;
}

/* GET /api/optimization */
export interface OptimizationRecord {
  id: string;
  risk_level: string;
  status: string;
  expected_return_before: number | null;
  volatility_before: number | null;
  expected_return_after: number | null;
  volatility_after: number | null;
  transaction_cost: number | null;
  created_at: string;
}

/* POST /api/optimize */
export interface AllocationItem {
  symbol: string;
  name: string;
  old_weight: number;
  new_weight: number;
}

export interface OptimizationResult {
  optimization_id: string;
  status: string;
  risk_level: string;
  expected_return_before: number;
  volatility_before: number;
  expected_return_after: number;
  volatility_after: number;
  transaction_cost: number;
  allocations: AllocationItem[];
  explanation: string;
}

export interface RebalanceOutcome {
  status?: string;
  message?: string;
  [key: string]: unknown;
}
