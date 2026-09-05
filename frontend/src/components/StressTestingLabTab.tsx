import { useState, useEffect } from 'react';
import {
  Zap,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  Crosshair,
} from 'lucide-react';
import { api } from '../api';
import type {
  Portfolio,
  RiskMetrics,
  Scenario,
  ScenarioRunResponse,
  ReverseStressResult,
} from '../types';


interface StressTestingLabTabProps {
  portfolio: Portfolio | null;
  riskMetrics: RiskMetrics | null;
  scenarios: Scenario[];
  onRebalanceSuccess: () => void;
}

function formatCurrency(val: number): string {
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function pct(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

export function StressTestingLabTab({
  portfolio,
  riskMetrics,
  scenarios,
  onRebalanceSuccess,
}: StressTestingLabTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'reverse' | 'forward'>('reverse');

  // Forward scenario state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [forwardLoading, setForwardLoading] = useState<boolean>(false);
  const [scenarioResult, setScenarioResult] = useState<ScenarioRunResponse | null>(null);
  const [rebalancing, setRebalancing] = useState<boolean>(false);
  const [rebalanceFeedback, setRebalanceFeedback] = useState<string | null>(null);

  // Reverse stress test state
  const [lossThresholdPct, setLossThresholdPct] = useState<number>(0.10); // 10%
  const [reverseLoading, setReverseLoading] = useState<boolean>(false);
  const [reverseResult, setReverseResult] = useState<ReverseStressResult | null>(null);

  // Set default scenario when scenarios load
  useEffect(() => {
    if (scenarios.length > 0 && !selectedScenarioId) {
      setSelectedScenarioId(scenarios[0].id);
    }
  }, [scenarios, selectedScenarioId]);

  // Run forward scenario
  const handleRunForwardScenario = async () => {
    if (!selectedScenarioId) return;
    setForwardLoading(true);
    setRebalanceFeedback(null);
    try {
      const res = await api.runScenario(selectedScenarioId);
      setScenarioResult(res);
    } catch (err: any) {
      console.error('Failed to run scenario:', err);
    } finally {
      setForwardLoading(false);
    }
  };

  // Run Reverse Stress Test
  const handleRunReverseStress = async (threshold = lossThresholdPct) => {
    setReverseLoading(true);
    try {
      const res = await api.runReverseStress(threshold);
      setReverseResult(res);
    } catch (err: any) {
      console.error('Failed to run reverse stress test:', err);
    } finally {
      setReverseLoading(false);
    }
  };

  // Auto-run reverse stress test on mount
  useEffect(() => {
    handleRunReverseStress(0.10);
  }, []);

  // Handle rebalance decision (Human-in-the-loop approval)
  const handleRebalanceAction = async (approved: boolean) => {
    if (!scenarioResult?.recommendation?.optimization_id) return;
    setRebalancing(true);
    try {
      await api.rebalance(scenarioResult.recommendation.optimization_id, approved);
      setRebalanceFeedback(
        approved
          ? '✓ Defensive rebalance approved and executed on active ledger!'
          : '✗ Defensive rebalance rejected by risk officer.'
      );
      onRebalanceSuccess();
    } catch (err: any) {
      setRebalanceFeedback(`Error: ${err.message}`);
    } finally {
      setRebalancing(false);
    }
  };

  return (
    <div className="stress-lab-page">
      {/* Banner & Sub-tab Switcher */}
      <div className="tab-banner">
        <div className="tab-banner-content">
          <div className="tab-title-row">
            <Zap className="tab-icon text-amber-400" size={24} />
            <h2>Stress & Reverse Stress Testing Laboratory</h2>
            <span className="badge-pill wow">THE WOW FEATURE</span>
          </div>
          <p className="tab-description">
            Evaluate portfolio resilience against extreme tail-risk events. Invert the risk question with{' '}
            <strong>Reverse Stress Testing</strong> to uncover the exact combination of shocks that breaches capital
            preservation limits, or run forward macroeconomic disaster simulations.
          </p>
        </div>

        {/* Sub-tab Pill Toggle */}
        <div className="stress-subtab-toggle">
          <button
            className={`subtab-pill ${activeSubTab === 'reverse' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('reverse')}
          >
            <Crosshair size={16} />
            Reverse Stress Testing (RST)
          </button>
          <button
            className={`subtab-pill ${activeSubTab === 'forward' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('forward')}
          >
            <AlertTriangle size={16} />
            Forward Macro Scenarios
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION A: REVERSE STRESS TESTING (THE WOW FEATURE)
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'reverse' && (
        <div className="reverse-stress-section">
          {/* Controls Card */}
          <div className="card rst-controls-card">
            <div className="rst-controls-header">
              <div>
                <div className="flex-center gap-2 mb-1">
                  <h3>Reverse Stress Testing Engine (Inverted Search)</h3>
                  {portfolio?.name && <span className="badge-pill indigo">{portfolio.name}</span>}
                </div>
                <p className="text-slate-400 text-sm">
                  Traditional stress asks: <em>"If market crashes X%, what do we lose?"</em> Reverse stress inverts:
                  <em> "What minimal shock breaches the capital barrier?"</em> Baseline volatility:{' '}
                  <strong className="text-slate-200">{pct(riskMetrics?.volatility ?? 0.14)}</strong>.
                </p>
              </div>

              <div className="threshold-control-box">
                <div className="threshold-label-row">
                  <span>Target Capital Breach Threshold:</span>
                  <strong className="text-rose-400">{(lossThresholdPct * 100).toFixed(0)}% Drawdown</strong>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.30"
                  step="0.01"
                  value={lossThresholdPct}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLossThresholdPct(val);
                    handleRunReverseStress(val);
                  }}
                  className="threshold-slider"
                />
                <div className="slider-ticks">
                  <span>-5% Capital Breach</span>
                  <span>-15% Buffer Loss</span>
                  <span>-30% Solvency Limit</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleRunReverseStress(lossThresholdPct)}
                disabled={reverseLoading}
              >
                <Search size={16} />
                {reverseLoading ? 'Searching...' : 'Calculate Minimal Breach Horizon'}
              </button>
            </div>
          </div>

          {/* Results Display */}
          {reverseResult && (
            <div className="rst-results-grid">
              {/* Left Column: Failure Horizon Metric & Narration */}
              <div className="card rst-horizon-card">
                <div className="card-header-flex">
                  <div>
                    <h4>Plausibility Horizon to Breach</h4>
                    <span className="card-subtitle">
                      Mahalanobis Distance under historical covariance (D_M = √(sᵀΣ⁻¹s))
                    </span>
                  </div>
                  <span
                    className={`badge-pill ${
                      reverseResult.plausibility === 'HIGH RISK'
                        ? 'danger'
                        : reverseResult.plausibility === 'MODERATE RISK'
                        ? 'warning'
                        : 'safe'
                    }`}
                  >
                    {reverseResult.plausibility}
                  </span>
                </div>

                <div className="horizon-meter-container">
                  <div className="horizon-number">
                    <span
                      className="horizon-sigma"
                      style={{
                        color:
                          reverseResult.mahalanobis_distance_sigma < 1.0
                            ? '#ef4444'
                            : reverseResult.mahalanobis_distance_sigma < 2.0
                            ? '#f59e0b'
                            : '#10b981',
                      }}
                    >
                      {reverseResult.mahalanobis_distance_sigma.toFixed(2)}σ
                    </span>
                    <span className="horizon-unit">distance to capital breach</span>
                  </div>

                  <div className="sigma-gauge-track">
                    <div
                      className="sigma-gauge-indicator"
                      style={{
                        left: `${Math.min(
                          100,
                          (reverseResult.mahalanobis_distance_sigma / 3.0) * 100
                        )}%`,
                        backgroundColor:
                          reverseResult.mahalanobis_distance_sigma < 1.0 ? '#ef4444' : '#f59e0b',
                      }}
                    ></div>
                  </div>
                  <div className="sigma-labels">
                    <span className="text-rose-400">0σ (Imminent Breach)</span>
                    <span className="text-amber-400">1.5σ (Elevated Stress)</span>
                    <span className="text-emerald-400">3.0σ (Safe Zone)</span>
                  </div>
                </div>

                {/* Plain-English Narration */}
                <div className="rst-narration-box">
                  <div className="flex-center gap-2 mb-1 text-indigo-300 font-semibold text-sm">
                    <Sparkles size={16} />
                    <span>Explainable Risk Officer Rationale</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{reverseResult.narrative}</p>
                </div>

                {/* Capital Impact Strip */}
                <div className="capital-loss-strip">
                  <div className="strip-item">
                    <span className="strip-label">Current Capital:</span>
                    <span className="strip-val">{formatCurrency(reverseResult.capital_before)}</span>
                  </div>
                  <div className="strip-arrow">→</div>
                  <div className="strip-item">
                    <span className="strip-label">Post-Breach Capital:</span>
                    <span className="strip-val text-rose-400">
                      {formatCurrency(reverseResult.capital_after)}
                    </span>
                  </div>
                  <div className="strip-item">
                    <span className="strip-label">Breach Loss:</span>
                    <span className="strip-val text-rose-400">
                      -{formatCurrency(reverseResult.projected_loss_amount)} (
                      {pct(reverseResult.projected_loss_pct)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Minimal Shock Vector & Vulnerability Ranking */}
              <div className="card rst-shocks-card">
                <div className="card-header-flex">
                  <div>
                    <h4>Minimal Shock Vector (Most Plausible Path)</h4>
                    <span className="card-subtitle">
                      Exact asset drawdowns needed to breach the {(lossThresholdPct * 100).toFixed(0)}% buffer
                    </span>
                  </div>
                </div>

                <div className="shock-bars-list">
                  {Object.entries(reverseResult.minimal_shocks).map(([sym, shockVal]) => {
                    const isDown = shockVal < 0;
                    return (
                      <div key={sym} className="shock-bar-item">
                        <div className="shock-bar-label">
                          <strong>{sym}</strong>
                          <span className={isDown ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                            {shockVal >= 0 ? `+${pct(shockVal)}` : pct(shockVal)}
                          </span>
                        </div>
                        <div className="shock-progress-bg">
                          <div
                            className={`shock-progress-fill ${isDown ? 'down' : 'up'}`}
                            style={{ width: `${Math.min(100, Math.abs(shockVal) * 180)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="vulnerability-table-wrapper mt-4">
                  <h5>Single-Asset Vulnerability Sensitivity</h5>
                  <table className="vulnerability-table">
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Weight</th>
                        <th>Single-Asset Breach Drop</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reverseResult.vulnerabilities.map((v) => (
                        <tr key={v.symbol}>
                          <td>
                            <strong>{v.symbol}</strong>
                          </td>
                          <td>{pct(v.weight)}</td>
                          <td className="text-rose-400 font-semibold">
                            {v.single_asset_breach_drop <= -1.0
                              ? 'Cannot breach alone'
                              : pct(v.single_asset_breach_drop)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION B: FORWARD SYSTEMIC MACRO SCENARIOS
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'forward' && (
        <div className="forward-scenarios-section">
          {/* Scenario Selector Card */}
          <div className="card mb-6">
            <div className="card-header-flex">
              <div>
                <h3>Macro Scenario Simulation Runner</h3>
                <span className="card-subtitle">
                  Apply historical liquidity shocks and examine automatic control engine response
                </span>
              </div>
            </div>

            <div className="scenario-selector-grid">
              {scenarios.map((sc) => {
                const isSelected = selectedScenarioId === sc.id;
                return (
                  <div
                    key={sc.id}
                    className={`scenario-card-select ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedScenarioId(sc.id)}
                  >
                    <div className="scenario-card-header">
                      <span className="scenario-name">{sc.name}</span>
                      {isSelected && <span className="selected-indicator">✓ Active</span>}
                    </div>
                    <p className="scenario-desc">{sc.description}</p>
                    <div className="scenario-shocks-preview">
                      {sc.shocks.map((sh) => (
                        <span
                          key={sh.asset_symbol}
                          className={`shock-chip ${sh.shock_percentage < 0 ? 'down' : 'up'}`}
                        >
                          {sh.asset_symbol}: {sh.shock_percentage > 0 ? '+' : ''}
                          {(sh.shock_percentage * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="scenario-run-footer mt-4">
              <button
                className="btn btn-warning"
                onClick={handleRunForwardScenario}
                disabled={forwardLoading || !selectedScenarioId}
              >
                <Zap size={16} />
                {forwardLoading ? 'Simulating...' : 'Execute Macro Stress Simulation'}
              </button>
            </div>
          </div>

          {/* Forward Scenario Results */}
          {scenarioResult && (
            <div className="scenario-impact-container">
              {/* Before / After Impact Cards */}
              <div className="card mb-6">
                <div className="card-header-flex">
                  <div>
                    <h3>Stress Impact Assessment: {scenarioResult.scenario.name}</h3>
                    <span className="card-subtitle">
                      Pre-shock baseline vs. Post-shock damage and rule-engine diagnosis
                    </span>
                  </div>
                  <span className={`risk-badge ${scenarioResult.after_shock.risk_level.toLowerCase()}`}>
                    POST-SHOCK: {scenarioResult.after_shock.risk_level}
                  </span>
                </div>

                <div className="impact-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Portfolio Capital</span>
                    <div className="stat-numbers">
                      <span>{formatCurrency(scenarioResult.before.portfolio_value)}</span>
                      <span className="text-rose-400">
                        → {formatCurrency(scenarioResult.shock.portfolio_value_after)}
                      </span>
                    </div>
                    <span className="stat-delta text-rose-400 font-bold">
                      {pct(scenarioResult.shock.portfolio_loss)} drawdown
                    </span>
                  </div>

                  <div className="stat-box">
                    <span className="stat-label">Composite Risk Score</span>
                    <div className="stat-numbers">
                      <span>{scenarioResult.before.risk_score.toFixed(0)}</span>
                      <span className="text-rose-400">
                        → {scenarioResult.after_shock.risk_score.toFixed(0)}
                      </span>
                    </div>
                    <span className="stat-delta text-rose-400">
                      +{(scenarioResult.after_shock.risk_score - scenarioResult.before.risk_score).toFixed(0)} pts
                    </span>
                  </div>

                  <div className="stat-box">
                    <span className="stat-label">Annualized Volatility</span>
                    <div className="stat-numbers">
                      <span>{pct(scenarioResult.before.volatility)}</span>
                      <span className="text-amber-400">
                        → {pct(scenarioResult.after_shock.volatility)}
                      </span>
                    </div>
                  </div>

                  <div className="stat-box">
                    <span className="stat-label">Control Mode Triggered</span>
                    <div className="stat-numbers font-semibold text-rose-400">
                      {scenarioResult.control.mode}
                    </div>
                    <span className="stat-meta">
                      {scenarioResult.control.breaches.length} constraint breach(es)
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendation & Human-in-the-Loop Approval Card */}
              {scenarioResult.recommendation && (
                <div className="card recommendation-card">
                  <div className="card-header-flex">
                    <div className="flex-center gap-2">
                      <ShieldAlert className="text-amber-400" size={20} />
                      <div>
                        <h3>Defensive Reallocation Recommendation</h3>
                        <span className="card-subtitle">
                          Dynamic turnover-penalized optimizer proposal (Human Approval Required)
                        </span>
                      </div>
                    </div>
                    <span className="action-tag">{scenarioResult.recommendation.action}</span>
                  </div>

                  <p className="recommendation-explanation">
                    {scenarioResult.recommendation.explanation}
                  </p>

                  <div className="rebalance-metrics-strip">
                    <div>
                      <span>Turnover:</span>
                      <strong>{pct(scenarioResult.recommendation.turnover)}</strong>
                    </div>
                    <div>
                      <span>Est. Transaction Cost:</span>
                      <strong>{formatCurrency(scenarioResult.recommendation.transaction_cost)}</strong>
                    </div>
                    <div>
                      <span>Risk Score Improvement:</span>
                      <strong className="text-emerald-400">
                        {scenarioResult.recommendation.risk_before.toFixed(0)} →{' '}
                        {scenarioResult.recommendation.risk_after.toFixed(0)} (
                        {(
                          scenarioResult.recommendation.risk_after -
                          scenarioResult.recommendation.risk_before
                        ).toFixed(0)}{' '}
                        pts)
                      </strong>
                    </div>
                  </div>

                  {/* Allocation Target Chips */}
                  <div className="target-allocations-row">
                    <span className="target-title">Proposed Target Weights:</span>
                    {Object.entries(scenarioResult.recommendation.allocation).map(
                      ([sym, weight]) => (
                        <div key={sym} className="target-chip">
                          <span className="target-sym">{sym}:</span>
                          <span className="target-pct">{pct(weight)}</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Feedback Message */}
                  {rebalanceFeedback && (
                    <div
                      className={`feedback-box ${
                        rebalanceFeedback.startsWith('✓') ? 'success' : 'error'
                      }`}
                    >
                      {rebalanceFeedback}
                    </div>
                  )}

                  {/* Approval Actions */}
                  <div className="rebalance-actions-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleRebalanceAction(true)}
                      disabled={rebalancing}
                    >
                      <CheckCircle2 size={16} />
                      {rebalancing ? 'Executing...' : 'Approve & Execute Rebalance'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRebalanceAction(false)}
                      disabled={rebalancing}
                    >
                      <XCircle size={16} />
                      Reject Recommendation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
