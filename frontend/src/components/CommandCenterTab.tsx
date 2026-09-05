import {
  TrendingUp,
  AlertTriangle,
  Activity,
  DollarSign,
  Shield,
  Droplets,
  Zap,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import type { Portfolio, RiskMetrics } from '../types';
import { RiskGauge } from './RiskGauge';

interface CommandCenterTabProps {
  portfolio: Portfolio | null;
  riskMetrics: RiskMetrics | null;
  onOpenConfig: () => void;
  onResetDemo: () => void;
  onNavigateToStress: () => void;
  onOptimize: () => void;
  isOptimizing: boolean;
}

function formatCurrency(val: number): string {
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function pct(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

export function CommandCenterTab({
  portfolio,
  riskMetrics,
  onOpenConfig,
  onResetDemo,
  onNavigateToStress,
  onOptimize,
  isOptimizing,
}: CommandCenterTabProps) {
  const capital = portfolio ? Number(portfolio.total_capital) : 10000000;
  const level = riskMetrics?.risk_level || 'SAFE';
  const score = riskMetrics?.risk_score || 25;
  const regime = riskMetrics?.regime || 'CALM';

  // Institutional Risk Ladder stages
  const ladderSteps = [
    { level: 'SAFE', label: 'GREEN: Normal', desc: 'Full alpha seeking, unconstrained allocation' },
    { level: 'WARNING', label: 'YELLOW: Advisory', desc: 'Correlation rising, equity cap tightened to 50%' },
    { level: 'STRESS', label: 'ORANGE: Defensive', desc: 'Turnover-penalized CVaR tilt, equity cap 35%' },
    { level: 'CRISIS', label: 'RED: Capital Guard', desc: 'Emergency cash preservation, equity cap 20%' },
  ];

  const currentStepIndex =
    level === 'CRISIS' ? 3 : level === 'STRESS' ? 2 : level === 'WARNING' ? 1 : 0;

  return (
    <div className="command-center-page">
      {/* Risk Ladder Status Strip */}
      <div className="risk-ladder-container">
        <div className="ladder-header">
          <div className="flex-center gap-2">
            <Shield size={18} className="text-indigo-400" />
            <span className="ladder-title">Aegis Capital Defense Ladder</span>
          </div>
          <span className="ladder-subtitle">
            Autonomous regime-aware rule engine (Detect → Diagnose → Decide)
          </span>
        </div>

        <div className="ladder-steps-row">
          {ladderSteps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isPassed = idx < currentStepIndex;
            return (
              <div
                key={step.level}
                className={`ladder-step ${step.level.toLowerCase()} ${
                  isActive ? 'active' : isPassed ? 'passed' : ''
                }`}
              >
                <div className="step-indicator-bar"></div>
                <div className="step-content">
                  <div className="step-title">
                    {step.label}
                    {isActive && <span className="active-tag">CURRENT</span>}
                  </div>
                  <div className="step-desc">{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Gauge & Hero Metrics */}
      <div className="command-hero-grid">
        {/* Risk Score & Regime Card */}
        <div className="card gauge-card">
          <div className="card-header-flex">
            <div>
              <h3>Institutional Risk Engine</h3>
              <span className="card-subtitle">Composite Multi-Factor Risk Score</span>
            </div>
            <div className="regime-pill-box">
              <span className="pulse-dot"></span>
              <span>{regime} REGIME</span>
            </div>
          </div>

          <div className="gauge-wrapper">
            <RiskGauge score={score} level={level} regime={regime} />
          </div>

          <div className="risk-factor-pills">
            <div className="factor-pill">
              <span className="factor-label">Vol Stress</span>
              <span className="factor-val">
                {((riskMetrics?.market_stress ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="factor-pill">
              <span className="factor-label">Drawdown</span>
              <span className="factor-val">
                {pct(riskMetrics?.max_drawdown ?? 0)}
              </span>
            </div>
            <div className="factor-pill">
              <span className="factor-label">Concentration</span>
              <span className="factor-val">
                {(riskMetrics?.concentration ?? 0.25).toFixed(2)}
              </span>
            </div>
            <div className="factor-pill">
              <span className="factor-label">Liquidity</span>
              <span className="factor-val">
                {pct(riskMetrics?.liquidity_ratio ?? 0.9)}
              </span>
            </div>
          </div>
        </div>

        {/* 8 Headline KPI Cards */}
        <div className="kpi-grid">
          {/* 1. Total Capital */}
          <div className="card kpi-card">
            <div className="kpi-icon-box indigo">
              <DollarSign size={20} />
            </div>
            <div className="kpi-body">
              <div className="kpi-title">Total Active Capital</div>
              <div className="kpi-number">{formatCurrency(capital)}</div>
              <div className="kpi-meta">{portfolio?.name || 'Aegis Treasury'}</div>
            </div>
          </div>

          {/* 2. Expected Return */}
          <div className="card kpi-card">
            <div className="kpi-icon-box emerald">
              <TrendingUp size={20} />
            </div>
            <div className="kpi-body">
              <div className="kpi-title">Expected Return (Ann.)</div>
              <div className="kpi-number text-emerald-400">
                {pct(riskMetrics?.expected_return ?? 0.11)}
              </div>
              <div className="kpi-meta">Weighted asset mean</div>
            </div>
          </div>

          {/* 3. Volatility */}
          <div className="card kpi-card">
            <div className="kpi-icon-box amber">
              <Activity size={20} />
            </div>
            <div className="kpi-body">
              <div className="kpi-title">Portfolio Volatility</div>
              <div className="kpi-number">{pct(riskMetrics?.volatility ?? 0.14)}</div>
              <div className="kpi-meta">√(wᵀΣw) Annualized</div>
            </div>
          </div>

          {/* 4. Value at Risk (VaR 95%) */}
          <div className="card kpi-card">
            <div className="kpi-icon-box rose">
              <AlertTriangle size={20} />
            </div>
            <div className="kpi-body">
              <div className="kpi-title">1-Day VaR (95%)</div>
              <div className="kpi-number text-rose-400">
                {pct(riskMetrics?.var_95 ?? 0.015)}
              </div>
              <div className="kpi-meta">
                {formatCurrency(capital * (riskMetrics?.var_95 ?? 0.015))} at risk
              </div>
            </div>
          </div>

          {/* 5. Conditional VaR (CVaR 95%) */}
          <div className="card kpi-card">
            <div className="kpi-icon-box purple">
              <Shield size={20} />
            </div>
            <div className="kpi-body">
              <div className="kpi-title">CVaR (Expected Shortfall)</div>
              <div className="kpi-number text-purple-400">
                {pct(riskMetrics?.cvar_95 ?? 0.019)}
              </div>
              <div className="kpi-meta">Tail risk beyond 95%</div>
            </div>
          </div>

          {/* 6. Sharpe Ratio */}
          <div className="card kpi-card">
            <div className="kpi-icon-box cyan">
              <Zap size={20} />
            </div>
            <div className="kpi-body">
              <div className="kpi-title">Sharpe Ratio</div>
              <div className="kpi-number text-cyan-400">
                {(riskMetrics?.sharpe_ratio ?? 1.25).toFixed(2)}
              </div>
              <div className="kpi-meta">(r - 6.5% Rf) / σ</div>
            </div>
          </div>

          {/* 7. Max Drawdown */}
          <div className="card kpi-card">
            <div className="kpi-icon-box orange">
              <Activity size={20} />
            </div>
            <div className="kpi-body">
              <div className="kpi-title">Historical Max DD</div>
              <div className="kpi-number">{pct(riskMetrics?.max_drawdown ?? 0.08)}</div>
              <div className="kpi-meta">Peak to trough</div>
            </div>
          </div>

          {/* 8. Liquidity Buffer */}
          <div className="card kpi-card">
            <div className="kpi-icon-box teal">
              <Droplets size={20} />
            </div>
            <div className="kpi-body">
              <div className="kpi-title">Liquidity Buffer</div>
              <div className="kpi-number text-teal-400">
                {pct(riskMetrics?.liquidity_ratio ?? 0.92)}
              </div>
              <div className="kpi-meta">T+0 Liquidity score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions & Execution Row */}
      <div className="command-actions-card card">
        <div className="actions-info">
          <h4>Capital Preservation Controls & Governance</h4>
          <p>
            Autonomous risk engine continuously evaluates threshold breaches. Reallocation recommendations enforce
            human-in-the-loop safety approvals before updating ledger holdings.
          </p>
        </div>
        <div className="actions-button-group">
          <button className="btn btn-secondary" onClick={onOpenConfig}>
            <Sliders size={16} />
            Configure Portfolio
          </button>
          <button className="btn btn-secondary" onClick={onResetDemo} title="Reset to ₹1 Crore demo benchmark">
            <RotateCcw size={16} />
            Reset Benchmark
          </button>
          <button className="btn btn-warning" onClick={onNavigateToStress}>
            <Zap size={16} />
            Run Stress Lab
          </button>
          <button
            className="btn btn-primary"
            onClick={onOptimize}
            disabled={isOptimizing}
          >
            {isOptimizing ? 'Optimizing...' : 'One-Click Defensive Rebalance'}
          </button>
        </div>
      </div>
    </div>
  );
}
