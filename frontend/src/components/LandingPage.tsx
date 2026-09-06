import { useState } from 'react';
import {
  Shield,
  ArrowRight,
  AlertTriangle,
  Zap,
  Activity,
  BarChart3,
  Sliders,
  Lock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface LandingPageProps {
  onLaunchTerminal: () => void;
}

export function LandingPage({ onLaunchTerminal }: LandingPageProps) {
  // Interactive shock simulator state
  const [shockPercent, setShockPercent] = useState<number>(0);

  const simulatedScore = Math.min(100, Math.round(25 + shockPercent * 1.5));
  
  let simulatedZoneLabel = 'SAFE (GREEN)';
  let zoneColor = '#10b981';
  let recommendedEquity = 45;
  let recommendedCash = 5;

  if (simulatedScore >= 75) {
    simulatedZoneLabel = 'RED: Capital Guard';
    zoneColor = '#ef4444';
    recommendedEquity = 20;
    recommendedCash = 30;
  } else if (simulatedScore >= 55) {
    simulatedZoneLabel = 'ORANGE: Defensive';
    zoneColor = '#f97316';
    recommendedEquity = 30;
    recommendedCash = 20;
  } else if (simulatedScore >= 35) {
    simulatedZoneLabel = 'YELLOW: Advisory';
    zoneColor = '#f59e0b';
    recommendedEquity = 40;
    recommendedCash = 10;
  }

  const features = [
    {
      icon: Shield,
      title: 'Safe Operating Envelope (SOE)',
      tag: 'Dynamic Boundary',
      desc: 'Multi-factor risk tracking evaluating volatility, drawdowns, liquidity, and concentration against 4 parameterized zones with anti-chattering hysteresis.',
      color: 'indigo',
    },
    {
      icon: BarChart3,
      title: 'Euler Risk Attribution',
      tag: 'Marginal Risk Decomposition',
      desc: 'Decomposes total portfolio variance into marginal asset risk contributions (MCAR). Pinpoints which sleeve is driving disproportionate tail risk.',
      color: 'cyan',
    },
    {
      icon: Sliders,
      title: 'Minimum Necessary Intervention',
      tag: 'CVXPY Convex Solver',
      desc: 'Formulates the smallest feasible allocation change that restores safety boundaries while strictly penalizing turnover and transaction slippage.',
      color: 'emerald',
    },
    {
      icon: Zap,
      title: 'Reverse Stress Testing (DtF)',
      tag: 'The "WOW" Inverted Search',
      desc: 'Inverts traditional stress queries. Instead of "What do we lose?", it calculates exact Distance to Failure (DtF) to uncover the minimal shock required to breach capital.',
      color: 'amber',
    },
    {
      icon: Activity,
      title: 'Contagion Network Topology',
      tag: 'Correlation Spikes',
      desc: 'Force-directed D3 network mapping cross-asset transmission channels and crisis correlation convergence where historical diversification breaks down.',
      color: 'rose',
    },
    {
      icon: Sparkles,
      title: 'Institutional AI Copilot & RAG',
      tag: 'Contextual Governance',
      desc: 'LLM-powered supervisory assistant referencing corporate knowledge bases, policy documents, and mathematical proofs with full verifiable citation trails.',
      color: 'purple',
    },
  ];

  const governanceSteps = [
    {
      step: '01',
      title: 'Detect',
      subtitle: 'Continuous Regime Monitoring',
      desc: 'Monitors real-time asset covariance, drawdown velocity, and systemic liquidity buffers.',
    },
    {
      step: '02',
      title: 'Diagnose',
      subtitle: 'Euler Tail Risk Isolation',
      desc: 'Calculates asset-level marginal contribution to risk (MCAR) to expose hidden concentration.',
    },
    {
      step: '03',
      title: 'Decide',
      subtitle: 'Dynamic Rule-Engine Tightening',
      desc: 'Tightens asset caps and shifts risk tolerance parameters in response to regime escalation.',
    },
    {
      step: '04',
      title: 'Defend',
      subtitle: 'Minimum Turnover Quadratic Rebalance',
      desc: 'CVXPY solver computes candidate allocation restoring safety with minimal friction.',
    },
    {
      step: '05',
      title: 'Learn',
      subtitle: 'Immutable PostgreSQL Audit',
      desc: 'Stores every state snapshot, mathematical input, and human officer approval permanently.',
    },
  ];

  return (
    <div className="landing-container">
      {/* ─── Top Brand Header ─── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="nav-brand">
            <div className="logo-box">
              <Shield size={22} color="#ffffff" />
            </div>
            <div>
              <div className="brand-title">
                AEGIS <span className="brand-tag">CAPITAL GUARD</span>
              </div>
              <div className="brand-sub">Adaptive Capital Resilience & Risk-Control System</div>
            </div>
          </div>

          <div className="landing-nav-links">
            <a href="#philosophy" className="landing-nav-link">Control Philosophy</a>
            <a href="#simulator" className="landing-nav-link">Interactive Demo</a>
            <a href="#pillars" className="landing-nav-link">Core Engines</a>
            <a href="#governance" className="landing-nav-link">Governance Loop</a>
            <button className="btn btn-primary btn-sm" onClick={onLaunchTerminal}>
              <span>Launch Terminal</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="landing-hero">
        <div className="hero-glow-sphere"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="pulse-dot"></span>
            <span>Closed-Loop Capital Protection Architecture</span>
          </div>

          <h1 className="hero-title">
            Autonomous Capital Resilience Under Extreme Market Stress
          </h1>

          <p className="hero-description">
            Traditional portfolio optimizers treat risk as an open-loop calculation—continually chasing theoretical
            weights, incurring excessive turnover, and failing when crisis correlations spike.
            <strong> AEGIS reframes portfolio management as a closed-loop supervisory control system:</strong> see
            the shock before it lands, intervene with minimum necessary trading drag, and calculate your exact
            Distance to Failure.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onLaunchTerminal}>
              <span>Enter Risk Terminal</span>
              <ArrowRight size={18} />
            </button>
            <a href="#simulator" className="btn btn-secondary btn-lg">
              <Activity size={18} />
              <span>Try Interactive Simulator</span>
            </a>
          </div>

          {/* Quick Metrics Ticker */}
          <div className="hero-stats-ticker">
            <div className="stat-ticker-item">
              <span className="stat-val">₹1.00 Cr</span>
              <span className="stat-lbl">Canonical Benchmark</span>
            </div>
            <div className="stat-ticker-sep"></div>
            <div className="stat-ticker-item">
              <span className="stat-val">4 Zones</span>
              <span className="stat-lbl">Safe Operating Envelope</span>
            </div>
            <div className="stat-ticker-sep"></div>
            <div className="stat-ticker-item">
              <span className="stat-val">0.94σ</span>
              <span className="stat-lbl">Reverse Stress Distance to Failure</span>
            </div>
            <div className="stat-ticker-sep"></div>
            <div className="stat-ticker-item">
              <span className="stat-val">100%</span>
              <span className="stat-lbl">PostgreSQL Audit Ledger</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Crash & Control Simulator (Teaser) ─── */}
      <section id="simulator" className="landing-section">
        <div className="section-header-center">
          <div className="section-eyebrow">Interactive Simulation</div>
          <h2 className="section-heading">Experience Closed-Loop Protection in Action</h2>
          <p className="section-subheading">
            Drag the equity market shock slider below. Watch how the AEGIS Risk Engine detects threshold
            breaches in real time and formulates minimum-intervention portfolio adjustments.
          </p>
        </div>

        <div className="simulator-card card">
          <div className="simulator-top-row">
            <div className="slider-control-box">
              <div className="slider-header-flex">
                <span className="slider-title">Simulate Equity Market Crash:</span>
                <span className="slider-value font-mono">
                  {shockPercent === 0 ? '0% (Baseline)' : `-${shockPercent}% Drawdown`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={shockPercent}
                onChange={(e) => setShockPercent(Number(e.target.value))}
                className="simulator-slider"
              />
              <div className="slider-ticks">
                <span>0% (Calm)</span>
                <span>-10% (Correction)</span>
                <span>-20% (Bear Market)</span>
                <span>-30% (Crash)</span>
                <span>-40% (Systemic)</span>
              </div>
            </div>

            {/* Live Envelope Response Pill */}
            <div className="simulator-envelope-badge" style={{ borderColor: zoneColor }}>
              <div className="badge-title">Defense State:</div>
              <div className="badge-zone" style={{ color: zoneColor }}>
                {simulatedZoneLabel}
              </div>
              <div className="badge-score font-mono">
                Risk Score: <strong>{simulatedScore}/100</strong>
              </div>
            </div>
          </div>

          {/* Allocation Comparison Strip */}
          <div className="simulator-metrics-grid">
            <div className="sim-metric-box">
              <div className="sim-label">Equity Allocation</div>
              <div className="sim-val font-mono text-indigo-400">
                {recommendedEquity}%
              </div>
              <div className="sim-sub">
                {shockPercent === 0 ? 'Baseline 45%' : `Restrained from 45% to ${recommendedEquity}%`}
              </div>
            </div>

            <div className="sim-metric-box">
              <div className="sim-label">Defensive Cash Buffer</div>
              <div className="sim-val font-mono text-emerald-400">
                {recommendedCash}%
              </div>
              <div className="sim-sub">
                {shockPercent === 0 ? 'Baseline 5%' : `Expanded to absorb systemic liquidity shock`}
              </div>
            </div>

            <div className="sim-metric-box">
              <div className="sim-label">Turnover Penalty</div>
              <div className="sim-val font-mono text-amber-400">
                {shockPercent === 0 ? '0.0%' : `${(shockPercent * 0.45).toFixed(1)}%`}
              </div>
              <div className="sim-sub">Minimum necessary trading friction</div>
            </div>

            <div className="sim-metric-box">
              <div className="sim-label">Certification Status</div>
              <div className="sim-val text-cyan-400 flex items-center gap-1.5 font-sans text-base">
                <CheckCircle2 size={16} /> Certified Safe
              </div>
              <div className="sim-sub">Independent validator verified</div>
            </div>
          </div>

          <div className="simulator-footer-cta">
            <span>Witness full Euler risk attribution, reverse stress sweeps, and Copilot reasoning:</span>
            <button className="btn btn-primary btn-sm" onClick={onLaunchTerminal}>
              <span>Open Live Scenario Engine</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── The Paradigm Shift: Open-Loop vs Closed-Loop ─── */}
      <section id="philosophy" className="landing-section">
        <div className="section-header-center">
          <div className="section-eyebrow">The Architectural Paradigm Shift</div>
          <h2 className="section-heading">Why Open-Loop Optimization Fails in Crises</h2>
          <p className="section-subheading">
            Modern Portfolio Theory was engineered for stationary conditions. AEGIS solves the 3 fatal flaws of traditional rebalancing.
          </p>
        </div>

        <div className="comparison-grid">
          {/* Traditional */}
          <div className="comparison-card traditional">
            <div className="comparison-card-header">
              <AlertTriangle className="text-rose-400" size={24} />
              <div>
                <h3>Traditional Open-Loop Systems</h3>
                <span className="card-subtitle">Markowitz MVO / Pure Mean-Variance</span>
              </div>
            </div>
            <ul className="comparison-list">
              <li>
                <strong>Error Maximization:</strong> Inverting noisy covariance matrices magnifies estimation error, allocating heavily to outlier assets.
              </li>
              <li>
                <strong>Excessive Turnover:</strong> Minor price fluctuations trigger continual trading, creating severe transaction fee drag.
              </li>
              <li>
                <strong>Correlation Convergence:</strong> Assumes diversification persists, but correlations spike to 1.0 during severe market stress.
              </li>
              <li>
                <strong>Zero Headroom Awareness:</strong> Blind to proximity to insolvency or corporate survival boundaries.
              </li>
            </ul>
          </div>

          {/* AEGIS */}
          <div className="comparison-card aegis">
            <div className="comparison-card-header">
              <Shield className="text-indigo-400" size={24} />
              <div>
                <h3>AEGIS Closed-Loop Governance</h3>
                <span className="card-subtitle">Regime-Aware Convex Control</span>
              </div>
            </div>
            <ul className="comparison-list">
              <li>
                <strong>Safe Operating Envelope:</strong> Defines acceptable multi-factor risk boundaries (GREEN, YELLOW, ORANGE, RED) with anti-chattering.
              </li>
              <li>
                <strong>Minimum Necessary Intervention:</strong> Quadratic optimization prioritizes staying close to current weights, minimizing turnover.
              </li>
              <li>
                <strong>Euler Risk Attribution:</strong> Isolates exact marginal risk drivers (MCAR) before proposing candidate reallocations.
              </li>
              <li>
                <strong>Reverse Stress Inversion:</strong> Computes Distance to Failure (DtF) to know the minimal market break required to trigger ruin.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── 6 Core Capabilities ─── */}
      <section id="pillars" className="landing-section">
        <div className="section-header-center">
          <div className="section-eyebrow">Core Capabilities</div>
          <h2 className="section-heading">Engineered for Institutional Capital Preservation</h2>
          <p className="section-subheading">
            Six interconnected mathematical engines designed to safeguard corporate treasuries, endowments, and family offices.
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="card feature-card">
                <div className={`feature-icon-box ${f.color}`}>
                  <Icon size={22} />
                </div>
                <div className="feature-tag">{f.tag}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5-Stage Governance Stepper ─── */}
      <section id="governance" className="landing-section">
        <div className="section-header-center">
          <div className="section-eyebrow">Human-in-the-Loop Supervisory Workflow</div>
          <h2 className="section-heading">The 5-Stage Capital Defense Loop</h2>
          <p className="section-subheading">
            Every market alert passes through a deterministic governance pipeline before human approval and ledger execution.
          </p>
        </div>

        <div className="stepper-grid">
          {governanceSteps.map((s, idx) => (
            <div key={s.step} className="stepper-item">
              <div className="stepper-badge">{s.step}</div>
              <h3 className="stepper-title">{s.title}</h3>
              <div className="stepper-subtitle">{s.subtitle}</div>
              <p className="stepper-desc">{s.desc}</p>
              {idx < governanceSteps.length - 1 && (
                <div className="stepper-connector"></div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Mathematical Rigor & Compliance Banner ─── */}
      <section className="landing-section">
        <div className="audit-rigor-card card">
          <div className="audit-content">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={20} className="text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-100">Deterministic Mathematical Rigor</h3>
            </div>
            <p className="text-sm text-slate-300 mb-4 max-w-2xl">
              AEGIS utilizes CVXPY quadratic programming backed by industry-standard solvers (Clarabel, OSQP, SCS).
              Every asset weight vector satisfies the strict budget constraint, long-only positivity,
              and turnover penalties. All decision trees and optimizer results are cryptographically committed to PostgreSQL.
            </p>
            <div className="audit-badges">
              <span className="audit-badge">CVXPY 1.9+</span>
              <span className="audit-badge">SciPy & NumPy</span>
              <span className="audit-badge">PostgreSQL 16 Audit Ledger</span>
              <span className="audit-badge">FastAPI Asynchronous Gateway</span>
            </div>
          </div>
          <div className="audit-cta">
            <button className="btn btn-primary" onClick={onLaunchTerminal}>
              <span>Launch Live System</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA Banner ─── */}
      <section className="landing-cta-banner">
        <div className="cta-banner-content">
          <h2 className="cta-banner-title">Ready to Experience Closed-Loop Capital Protection?</h2>
          <p className="cta-banner-desc">
            Explore the canonical ₹1.00 Crore institutional portfolio, test extreme stress scenarios,
            and inspect the live reverse stress testing frontier.
          </p>
          <button className="btn btn-primary btn-lg" onClick={onLaunchTerminal}>
            <span>Enter AEGIS Terminal Now</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo-box">
              <Shield size={18} color="#ffffff" />
            </div>
            <div>
              <div className="brand-title text-sm">AEGIS CAPITAL GUARD</div>
              <div className="text-xs text-slate-500">Adaptive Capital Resilience & Risk-Control System</div>
            </div>
          </div>

          <div className="footer-meta text-xs text-slate-500">
            Institutional Simulation & Supervisory Platform • Not connected to real money brokerages.
          </div>
        </div>
      </footer>
    </div>
  );
}
