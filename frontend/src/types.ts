/* API types matching backend Pydantic schemas */

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

export interface CustomHoldingInput {
  symbol: string;
  weight: number;
}

export interface CustomPortfolioPayload {
  name: string;
  total_capital: number;
  risk_aversion: number;
  holdings: CustomHoldingInput[];
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
  var_95?: number;
  cvar_95?: number;
  sharpe_ratio?: number;
  regime?: string;
  risk_contributions?: Record<string, number>;
  hhi_risk?: number;
  correlation_matrix?: Record<string, Record<string, number>>;
}

export interface RiskResponse {
  metrics: RiskMetrics;
  snapshot_id: string;
}

export interface VulnerabilityItem {
  symbol: string;
  name: string;
  weight: number;
  single_asset_breach_drop: number;
}

export interface ReverseStressResult {
  target_loss_pct: number;
  target_loss_amount: number;
  projected_loss_pct: number;
  projected_loss_amount: number;
  capital_before: number;
  capital_after: number;
  mahalanobis_distance_sigma: number;
  plausibility: 'HIGH RISK' | 'MODERATE RISK' | 'RESILIENT';
  minimal_shocks: Record<string, number>;
  vulnerabilities: VulnerabilityItem[];
  narrative: string;
}

export interface RebalanceHistoryItem {
  id: string;
  action: string;
  approved: boolean;
  transaction_cost: number | null;
  risk_before: number | null;
  risk_after: number | null;
  reason: string | null;
  created_at: string;
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

export interface ScenarioRunResponse {
  scenario: {
    id: string;
    name: string;
    description: string | null;
  };
  before: {
    portfolio_value: number;
    risk_score: number;
    risk_level: string;
    volatility: number;
    drawdown: number;
    liquidity: number;
  };
  shock: {
    details: Record<string, number>;
    portfolio_loss: number;
    portfolio_value_after: number;
  };
  after_shock: {
    risk_score: number;
    risk_level: string;
    volatility: number;
    drawdown: number;
    liquidity: number;
  };
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
