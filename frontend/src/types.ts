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

export interface RiskMetrics {
  expected_return: number;
  volatility: number;
  max_drawdown: number;
  liquidity_ratio: number;
  concentration: number;
  market_stress: number;
  risk_score: number;
  risk_level: string;
  risk_status?: string;
  operating_envelope?: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | string;
  intervention_required?: boolean;
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

export interface ValidationCheck {
  name: string;
  label: string;
  passed: boolean;
  value: number | string;
  target: number | string;
}

export interface ValidatorResult {
  status: 'PASS' | 'BLOCKED' | string;
  valid: boolean;
  is_valid?: boolean;
  checks: ValidationCheck[];
  violations: string[];
}

export interface ScenarioRunResponse {
  scenario: {
    id: string;
    name: string;
    description: string | null;
  };
  current?: {
    risk_score: number;
    status: string;
    risk_level: string;
    operating_envelope: string;
    intervention_required: boolean;
    allocation: Record<string, number>;
  };
  stressed?: {
    risk_score: number;
    status: string;
    risk_level: string;
    operating_envelope: string;
    intervention_required: boolean;
    volatility: number;
    drawdown: number;
    liquidity: number;
  };
  before: {
    portfolio_value: number;
    risk_score: number;
    risk_level: string;
    operating_envelope?: string;
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
    risk_status?: string;
    operating_envelope?: string;
    intervention_required?: boolean;
    volatility: number;
    drawdown: number;
    liquidity: number;
  };
  control: {
    mode: string;
    operating_envelope?: string;
    intervention_required?: boolean;
    breaches: string[];
    constraints: Record<string, number>;
  };
  recommendation: {
    action: string;
    optimization_id: string;
    allocation: Record<string, number>;
    current_allocation?: Record<string, number>;
    proposed_allocation?: Record<string, number>;
    transaction_cost: number;
    turnover: number;
    risk_before: number;
    risk_after: number;
    intervention_required?: boolean;
    explanation: string;
    validator: ValidatorResult;
    validation?: ValidatorResult;
  };
}

export interface RiskAttributionItem {
  symbol: string;
  name: string;
  weight: number;
  marginal_risk_contribution: number;
  absolute_risk_contribution: number;
  percentage_risk_contribution: number;
  percentage_risk_pct: number;
  is_primary_risk_driver: boolean;
}

export interface RiskAttributionResponse {
  portfolio_volatility: number;
  risk_attributions: RiskAttributionItem[];
  primary_driver: string;
  primary_driver_risk_pct: number;
}

export interface ReverseStressPoint {
  alpha: number;
  alpha_pct: string;
  score: number;
  loss_pct: number;
  envelope: string;
}

export interface ReverseStressResponse {
  status: 'RESILIENT' | 'MODERATE' | 'VULNERABLE';
  distance_to_failure: number;
  distance_to_failure_pct: string;
  critical_shock_multiplier: number;
  failure_risk_score: number;
  failure_threshold: number;
  resilience_score: number;
  critical_shock_vector?: Record<string, {
    shock_pct: number;
    direction: 'loss' | 'gain' | 'neutral';
    label: string;
  }>;
  sweep_points: ReverseStressPoint[];
}

export interface ContagionCluster {
  name: string;
  assets: string[];
  capital_exposure: number;
  capital_exposure_pct: string;
  risk_contribution: number;
  risk_contribution_pct: string;
  normal_correlation: number;
  stress_correlation: number;
  contagion_flag: string;
  description: string;
}

export interface DecisionOutcomeItem {
  decision_id: string;
  timestamp: string;
  action: string;
  approved: boolean;
  regime_at_decision: string;
  risk_score_before: number;
  risk_score_after: number;
  risk_reduction_achieved: number;
  transaction_cost: number;
  reason: string;
  subsequent_outcome: {
    horizon: string;
    loss_avoided_pct: string;
    capital_preserved_est: string;
    resilience_maintained: boolean;
    audit_status: string;
  };
}

export interface CopilotAssessment {
  summary: string;
  operating_envelope: string;
  risk_status: string;
  market_regime: string;
  regime_confidence: string;
  primary_risk_driver: string;
  primary_risk_driver_pct: number;
  distance_to_failure: string;
  resilience_score: number;
  why_is_this_happening: string;
  why_this_intervention: string;
  what_could_go_wrong: string;
  policy_evidence: Array<{
    document: string;
    section: string;
    relevance_score: number;
    content: string;
  }>;
  custom_response?: string | null;
  answer?: string;
  response?: string;
  data_sources?: string[];
  tool_calls?: string[];
  intent?: string;
  llm_meta?: {
    engine?: string;
    model?: string;
    intent?: string;
    tools_called?: string[];
  };
  latency_ms?: number;
}

export interface AEGISMasterState {
  portfolio: {
    id: string;
    name: string;
    total_capital: number;
    total_capital_cr: number;
    holdings: Array<{
      symbol: string;
      name: string;
      category: string;
      weight: number;
      weight_pct: string;
      market_value: number;
      risk_contribution_pct: number;
    }>;
  };
  market: {
    regime: 'CALM' | 'TRANSITION' | 'CRISIS';
    regime_confidence: number;
    regime_confidence_pct: string;
    regime_drivers: string[];
    regime_probabilities: { calm: number; transition: number; crisis: number };
    contagion: {
      average_normal_correlation: number;
      average_stressed_correlation: number;
      contagion_spread: number;
      diversification_health: string;
      clusters: ContagionCluster[];
      matrix?: {
        symbols: string[];
        normal: number[][];
        stressed: number[][];
      };
    };
  };
  risk: {
    expected_return: number;
    volatility: number;
    volatility_pct: string;
    var_95: number;
    var_95_pct: string;
    cvar_95: number;
    cvar_95_pct: string;
    max_drawdown: number;
    max_drawdown_pct: string;
    liquidity_ratio: number;
    liquidity_pct: string;
    concentration_hhi: number;
    market_stress: number;
    composite_score: number;
    operating_envelope: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
    risk_status: string;
    risk_level: string;
    intervention_required: boolean;
  };
  resilience: {
    distance_to_failure: number;
    distance_to_failure_pct: string;
    resilience_score: number;
    critical_shock_multiplier: number;
    status: string;
    failure_threshold: number;
  };
  prediction?: {
    model_type: string;
    horizon_days: number;
    current_risk_score: number;
    current_envelope: string;
    projected_risk_score: number;
    expected_volatility: number;
    expected_volatility_pct: string;
    probability_deterioration: number;
    probability_deterioration_pct: string;
    probability_red_breach: number;
    probability_red_breach_pct: string;
    expected_drawdown_range: [number, number];
    expected_drawdown_range_pct: string;
    warning_flag: boolean;
    interpretation: string;
  };
  active_recommendation?: {
    action_required: boolean;
    reason: string;
    turnover: number;
    turnover_pct: string;
    estimated_cost: number;
    target_weights: Record<string, number>;
    expected_risk_after: number;
  };
  validator_result?: {
    all_passed: boolean;
    hard_breaches: number;
    soft_warnings: number;
    checks: Array<{
      rule_name: string;
      passed: boolean;
      actual_value: number;
      limit_value: string;
      is_hard_constraint: boolean;
      message: string;
    }>;
  };
  copilot: {
    summary: string;
    why_is_this_happening: string;
    why_this_intervention: string;
    what_could_go_wrong: string;
    policy_evidence: Array<{
      document: string;
      section: string;
      relevance_score: number;
      content: string;
    }>;
  };
  knowledge_base?: {
    total_documents: number;
  };
}

export interface DocumentItem {
  document_id: string;
  filename: string;
  document_type: string;
  uploaded_at: string;
  chunk_count: number;
  file_size_kb: number;
  file_path?: string;
}

export interface MarketProviderStatus {
  active_provider: 'demo' | 'csv' | 'live' | string;
  metadata: {
    provider: string;
    name?: string;
    status: string;
    filename?: string;
    asset_count?: number;
    observations?: number;
    symbols?: string[];
    offline_ready?: boolean;
    endpoint?: string;
    fallback_active?: boolean;
  };
  available_providers: string[];
}

export interface BeforeAfterMetrics {
  risk_score: number;
  volatility: number;
  volatility_pct: string;
  var_95: number;
  var_95_pct: string;
  cvar_95: number;
  cvar_95_pct: string;
  max_drawdown: number;
  max_drawdown_pct: string;
  liquidity_ratio: number;
  liquidity_pct: string;
  concentration: number;
  operating_envelope: string;
  distance_to_failure: string;
  resilience_score: number;
}

export interface BeforeAfterComparison {
  before: BeforeAfterMetrics;
  after: BeforeAfterMetrics;
  improvements: {
    risk_reduction: number;
    volatility_reduction_pct: string;
    resilience_gain: number;
    capital_preserved_est: string;
  };
}

