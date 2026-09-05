import { useState, useEffect, useCallback } from 'react';
import {
  Shield, TrendingUp, AlertTriangle, Activity,
  DollarSign, BarChart3, Zap, CheckCircle2,
  XCircle, ChevronRight, RefreshCw, Droplets,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';
import { api } from './api';
import type {
  Portfolio, RiskResponse, Scenario, ScenarioRunResponse,
} from './types';

/* ─── Color palette for allocation ─── */
const ASSET_COLORS: Record<string, string> = {
  EQUITY: '#6366f1',
  GOV_BONDS: '#06b6d4',
  CORP_BONDS: '#8b5cf6',
  GOLD: '#f59e0b',
  CASH: '#10b981',
};

const RISK_COLORS: Record<string, string> = {
  SAFE: '#10b981',
  WARNING: '#f59e0b',
  STRESS: '#f97316',
  CRISIS: '#ef4444',
};

function formatCurrency(val: number): string {
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function pct(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

/* ─── Risk Gauge ─── */
function RiskGauge({ score, level }: { score: number; level: string }) {
  const color = RISK_COLORS[level] || '#6366f1';
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="risk-gauge">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="70" fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <circle cx="90" cy="90" r="70" fill="none"
          stroke={color} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="risk-gauge-label">
        <div className="risk-gauge-score" style={{ color }}>{score.toFixed(0)}</div>
        <span className={`risk-badge ${level.toLowerCase()}`}>{level}</span>
      </div>
    </div>
  );
}

/* ─── Allocation Chart ─── */
function AllocationChart({ data }: { data: { name: string; symbol: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
          innerRadius={55} outerRadius={85} paddingAngle={3}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.symbol} fill={ASSET_COLORS[entry.symbol] || '#6366f1'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, fontSize: '0.8rem', color: '#f1f5f9',
          }}
          formatter={(val: number) => pct(val)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ─── Before/After Bar ─── */
function ComparisonBar({
  label, before, after, format = 'pct', inverse = false,
}: {
  label: string; before: number; after: number;
  format?: 'pct' | 'score' | 'currency';
  inverse?: boolean;
}) {
  const isWorse = inverse ? after < before : after > before;
  const color = isWorse ? '#ef4444' : '#10b981';
  const fmt = (v: number) => {
    if (format === 'pct') return pct(v);
    if (format === 'currency') return formatCurrency(v);
    return v.toFixed(1);
  };

  return (
    <tr>
      <td style={{ color: 'var(--text-secondary)' }}>{label}</td>
      <td style={{ fontFamily: 'monospace' }}>{fmt(before)}</td>
      <td style={{ fontFamily: 'monospace', color }}>{fmt(after)}</td>
      <td>
        <ChevronRight size={14} style={{ color, transform: isWorse ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
      </td>
    </tr>
  );
}

/* ═══════════════════ MAIN DASHBOARD ═══════════════════ */
export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [risk, setRisk] = useState<RiskResponse | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<ScenarioRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [rebalanceLoading, setRebalanceLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Load initial data */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, r, s] = await Promise.all([
        api.getPortfolio(),
        api.getRisk(),
        api.getScenarios(),
      ]);
      setPortfolio(p);
      setRisk(r);
      setScenarios(s);
    } catch (e: any) {
      setError(e.message || 'Failed to load data. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* Run simulation */
  const runSimulation = async () => {
    if (!selectedScenario) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const result = await api.runScenario(selectedScenario);
      setSimResult(result);
    } catch (e: any) {
      setToast(`Simulation failed: ${e.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  /* Approve / Reject rebalance */
  const handleRebalance = async (approved: boolean) => {
    if (!simResult) return;
    setRebalanceLoading(true);
    try {
      await api.rebalance(simResult.recommendation.optimization_id, approved);
      setToast(approved ? '✅ Rebalance approved! Holdings updated.' : '❌ Rebalance rejected.');
      if (approved) {
        setSimResult(null);
        await loadData();
      }
    } catch (e: any) {
      setToast(`Rebalance failed: ${e.message}`);
    } finally {
      setRebalanceLoading(false);
    }
  };

  /* Toast auto-dismiss */
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  /* ─── Loading / Error ─── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <div className="spinner" />
        <span style={{ color: 'var(--text-secondary)' }}>Loading Smart Capital Guard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <AlertTriangle size={48} color="var(--accent-rose)" />
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center' }}>{error}</p>
        <button className="btn btn-primary" onClick={loadData}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (!portfolio || !risk) return null;

  const metrics = risk.metrics;
  const holdingsData = portfolio.holdings
    .map(h => ({
      name: h.asset?.name || 'Unknown',
      symbol: h.asset?.symbol || '?',
      value: h.weight,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
      {/* Toast */}
      {toast && (
        <div className="slide-down" style={{
          position: 'fixed', top: 20, right: 20, zIndex: 50,
          background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
          borderRadius: 12, padding: '12px 20px', boxShadow: 'var(--shadow-card)',
          fontSize: '0.875rem',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={32} color="var(--accent-indigo)" />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Smart Capital Guard
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Financial Risk Management & Capital Protection
            </p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={loadData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      {/* ─── Top Metrics ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="metric-card fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <DollarSign size={16} color="var(--accent-emerald)" />
            <span className="metric-label">Total Capital</span>
          </div>
          <div className="metric-value">{formatCurrency(portfolio.total_capital)}</div>
        </div>
        <div className="metric-card fade-in" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={16} color="var(--accent-cyan)" />
            <span className="metric-label">Expected Return</span>
          </div>
          <div className="metric-value">{pct(metrics.expected_return)}</div>
        </div>
        <div className="metric-card fade-in" style={{ animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Activity size={16} color="var(--accent-amber)" />
            <span className="metric-label">Volatility</span>
          </div>
          <div className="metric-value">{pct(metrics.volatility)}</div>
        </div>
        <div className="metric-card fade-in" style={{ animationDelay: '0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Droplets size={16} color="var(--accent-blue)" />
            <span className="metric-label">Liquidity</span>
          </div>
          <div className="metric-value">{pct(metrics.liquidity_ratio)}</div>
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Risk Gauge */}
        <div className="card fade-in">
          <div className="section-header">
            <Shield size={18} className="icon" />
            <h2>Risk Assessment</h2>
          </div>
          <RiskGauge score={metrics.risk_score} level={metrics.risk_level} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drawdown</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{pct(metrics.max_drawdown)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Concentration</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{metrics.concentration.toFixed(3)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Market Stress</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{metrics.market_stress.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk Score</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{metrics.risk_score.toFixed(1)}/100</div>
            </div>
          </div>
        </div>

        {/* Allocation */}
        <div className="card fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="section-header">
            <BarChart3 size={18} className="icon" />
            <h2>Current Allocation</h2>
          </div>
          <AllocationChart data={holdingsData} />
          <div style={{ marginTop: 12 }}>
            {holdingsData.map(h => (
              <div key={h.symbol} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: 3,
                    background: ASSET_COLORS[h.symbol] || '#6366f1',
                  }} />
                  <span style={{ fontSize: '0.85rem' }}>{h.name}</span>
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>
                  {pct(h.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Scenario Simulator ─── */}
      <div className="card fade-in" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <Zap size={18} className="icon" />
          <h2>Scenario Simulator</h2>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {scenarios.map(s => (
            <button
              key={s.id}
              className={`btn-scenario ${selectedScenario === s.id ? 'active' : ''}`}
              onClick={() => setSelectedScenario(s.id)}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.description}</div>
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={runSimulation}
          disabled={!selectedScenario || simLoading}
          style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: '1rem' }}
        >
          {simLoading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Running Simulation...</> : <><Zap size={18} /> RUN SIMULATION</>}
        </button>
      </div>

      {/* ─── Simulation Results ─── */}
      {simResult && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
          {/* Scenario Header */}
          <div className="card" style={{ borderColor: RISK_COLORS[simResult.after_shock.risk_level] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  {simResult.scenario.name} — Results
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{simResult.scenario.description}</p>
              </div>
              <span className={`risk-badge ${simResult.after_shock.risk_level.toLowerCase()}`}>
                {simResult.after_shock.risk_level}
              </span>
            </div>

            {/* Before / After Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="metric-card">
                <div className="metric-label">Portfolio Value</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  {formatCurrency(simResult.before.portfolio_value)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', marginTop: 4 }}>
                  → {formatCurrency(simResult.shock.portfolio_value_after)} ({pct(simResult.shock.portfolio_loss)})
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Risk Score</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: RISK_COLORS[simResult.before.risk_level] }}>
                  {simResult.before.risk_score}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', marginTop: 4 }}>
                  → {simResult.after_shock.risk_score}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Transaction Cost</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  {formatCurrency(simResult.recommendation.transaction_cost)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Turnover: {pct(simResult.recommendation.turnover)}
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Before</th>
                  <th>After Shock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <ComparisonBar label="Volatility" before={simResult.before.volatility} after={simResult.after_shock.volatility} />
                <ComparisonBar label="Max Drawdown" before={simResult.before.drawdown} after={simResult.after_shock.drawdown} />
                <ComparisonBar label="Liquidity" before={simResult.before.liquidity} after={simResult.after_shock.liquidity} inverse />
                <ComparisonBar label="Risk Score" before={simResult.before.risk_score} after={simResult.after_shock.risk_score} format="score" />
              </tbody>
            </table>
          </div>

          {/* Risk Breaches */}
          {simResult.control.breaches.length > 0 && (
            <div className="card">
              <div className="section-header">
                <AlertTriangle size={18} color="var(--accent-rose)" />
                <h2>Risk Breaches</h2>
              </div>
              {simResult.control.breaches.map((b, i) => (
                <div key={i} className="alert-item critical">
                  <AlertTriangle size={16} color="var(--accent-rose)" />
                  <span style={{ fontSize: '0.85rem' }}>{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommended Allocation */}
          <div className="card">
            <div className="section-header">
              <BarChart3 size={18} className="icon" />
              <h2>Recommended Allocation</h2>
              <span className={`risk-badge ${simResult.control.mode.toLowerCase()}`} style={{ marginLeft: 'auto' }}>
                {simResult.recommendation.action}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk Reduction:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>
                {simResult.recommendation.risk_before.toFixed(1)} → {simResult.recommendation.risk_after.toFixed(1)}
              </span>
            </div>

            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Current</th>
                  <th>Recommended</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(simResult.recommendation.allocation).map(([symbol, weight]) => {
                  const currentHolding = portfolio.holdings.find(
                    h => h.asset?.symbol.toLowerCase() === symbol
                  );
                  const currentWeight = currentHolding?.weight || 0;
                  const diff = weight - currentWeight;
                  const diffColor = diff > 0.01 ? 'var(--accent-emerald)' : diff < -0.01 ? 'var(--accent-rose)' : 'var(--text-muted)';
                  return (
                    <tr key={symbol}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: 2,
                            background: ASSET_COLORS[symbol.toUpperCase()] || '#6366f1',
                          }} />
                          {symbol.toUpperCase()}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{pct(currentWeight)}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{pct(weight)}</td>
                      <td style={{ fontFamily: 'monospace', color: diffColor }}>
                        {diff > 0 ? '+' : ''}{pct(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Explanation */}
          {simResult.recommendation.explanation && (
            <div className="card">
              <div className="section-header">
                <Activity size={18} className="icon" />
                <h2>Decision Explanation</h2>
              </div>
              <div className="explanation-box">
                {simResult.recommendation.explanation}
              </div>
            </div>
          )}

          {/* Approve / Reject */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-success"
              onClick={() => handleRebalance(true)}
              disabled={rebalanceLoading}
              style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '1rem' }}
            >
              {rebalanceLoading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : <CheckCircle2 size={20} />}
              APPROVE REBALANCE
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleRebalance(false)}
              disabled={rebalanceLoading}
              style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '1rem' }}
            >
              <XCircle size={20} /> REJECT
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '24px 0', fontSize: '0.7rem',
        color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)',
      }}>
        Smart Capital Guard — Simulation/Decision-Support System · Not for real trading
      </footer>
    </div>
  );
}
