import React, { useState, useEffect } from 'react';
import {
  Building2, X, Sparkles, Sliders, AlertCircle, CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { api } from './api';
import type { Portfolio, RiskResponse, CustomPortfolioPayload } from './types';

function formatCurrency(val: number): string {
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

interface PortfolioConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPortfolio: Portfolio;
  onSaveSuccess: (data: { portfolio: Portfolio; risk: RiskResponse }) => void;
}

const ASSET_CONFIG = [
  { symbol: 'EQUITY', name: 'Equity (NIFTY 50 / Index)', color: '#6366f1' },
  { symbol: 'GOV_BONDS', name: 'Government Bonds (10Y G-Sec)', color: '#06b6d4' },
  { symbol: 'CORP_BONDS', name: 'Corporate Bonds (AAA / PSU)', color: '#8b5cf6' },
  { symbol: 'GOLD', name: 'Gold (Physical / Sovereign)', color: '#f59e0b' },
  { symbol: 'CASH', name: 'Cash & Overnight Liquid Funds', color: '#10b981' },
];


const PRESETS = [
  {
    name: 'Smart Capital Benchmark',
    tag: 'Balanced Benchmark',
    desc: '45% Equity, 25% Gov, 15% Corp, 10% Gold, 5% Cash',
    weights: { EQUITY: 45, GOV_BONDS: 25, CORP_BONDS: 15, GOLD: 10, CASH: 5 },
    lambda: 1.0,
  },
  {
    name: 'Conservative Treasury',
    tag: 'Capital Preservation',
    desc: '10% Equity, 55% Gov, 20% Corp, 5% Gold, 10% Cash',
    weights: { EQUITY: 10, GOV_BONDS: 55, CORP_BONDS: 20, GOLD: 5, CASH: 10 },
    lambda: 2.5,
  },
  {
    name: 'Balanced Endowment',
    tag: 'Long-term Yield',
    desc: '35% Equity, 35% Gov, 15% Corp, 10% Gold, 5% Cash',
    weights: { EQUITY: 35, GOV_BONDS: 35, CORP_BONDS: 15, GOLD: 10, CASH: 5 },
    lambda: 1.5,
  },
  {
    name: 'Aggressive Growth',
    tag: 'Max Return Focus',
    desc: '60% Equity, 15% Gov, 10% Corp, 10% Gold, 5% Cash',
    weights: { EQUITY: 60, GOV_BONDS: 15, CORP_BONDS: 10, GOLD: 10, CASH: 5 },
    lambda: 0.5,
  },
];

const CAPITAL_CHIPS = [
  { label: '₹1 Cr', value: 10_000_000 },
  { label: '₹5 Cr', value: 50_000_000 },
  { label: '₹25 Cr', value: 250_000_000 },
  { label: '₹50 Cr', value: 500_000_000 },
  { label: '₹100 Cr', value: 1_000_000_000 },
];

export function PortfolioConfigModal({
  isOpen,
  onClose,
  currentPortfolio,
  onSaveSuccess,
}: PortfolioConfigModalProps) {
  const [name, setName] = useState(currentPortfolio.name || 'Corporate Treasury');
  const [capital, setCapital] = useState(currentPortfolio.total_capital || 10_000_000);
  const [lambda, setLambda] = useState(currentPortfolio.risk_aversion || 1.0);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize weights from current portfolio holdings
  useEffect(() => {
    if (isOpen) {
      setName(currentPortfolio.name || 'Corporate Treasury');
      setCapital(currentPortfolio.total_capital || 10_000_000);
      setLambda(currentPortfolio.risk_aversion || 1.0);
      setErrorMsg(null);

      const initialWeights: Record<string, number> = {};
      ASSET_CONFIG.forEach(a => {
        const found = currentPortfolio.holdings.find(
          h => h.asset?.symbol.toUpperCase() === a.symbol
        );
        initialWeights[a.symbol] = found ? Math.round(found.weight * 1000) / 10 : 0;
      });
      setWeights(initialWeights);
    }
  }, [isOpen, currentPortfolio]);

  if (!isOpen) return null;

  const totalWeight = Object.values(weights).reduce((sum, val) => sum + (val || 0), 0);
  const roundedSum = Math.round(totalWeight * 10) / 10;
  const isValidSum = Math.abs(roundedSum - 100.0) <= 0.5;

  const handleWeightChange = (symbol: string, val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val * 10) / 10));
    setWeights(prev => ({ ...prev, [symbol]: clamped }));
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setWeights({ ...preset.weights });
    setLambda(preset.lambda);
  };

  const handleAutoBalance = () => {
    if (totalWeight <= 0) {
      // Default equal distribution
      const equal = Math.round(1000 / ASSET_CONFIG.length) / 10;
      const balanced: Record<string, number> = {};
      ASSET_CONFIG.forEach(a => { balanced[a.symbol] = equal; });
      setWeights(balanced);
      return;
    }

    const factor = 100 / totalWeight;
    const balanced: Record<string, number> = {};
    let running = 0;
    const entries = Object.entries(weights);

    entries.forEach(([sym, w], idx) => {
      if (idx === entries.length - 1) {
        // Assign remainder to guarantee exact 100.0
        balanced[sym] = Math.max(0, Math.round((100 - running) * 10) / 10);
      } else {
        const normalized = Math.round(w * factor * 10) / 10;
        balanced[sym] = normalized;
        running += normalized;
      }
    });

    setWeights(balanced);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidSum) {
      setErrorMsg(`Asset allocations sum to ${roundedSum}%. They must total 100%. Click "Auto-Balance" to resolve.`);
      return;
    }
    if (capital <= 0) {
      setErrorMsg('Total capital must be greater than 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload: CustomPortfolioPayload = {
      name: name.trim() || 'Corporate Treasury',
      total_capital: capital,
      risk_aversion: lambda,
      holdings: Object.entries(weights).map(([symbol, pctVal]) => ({
        symbol,
        weight: Math.round((pctVal / 100) * 10000) / 10000,
      })),
    };

    try {
      const res = await api.saveCustomPortfolio(payload);
      onSaveSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update portfolio configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCapitalDisplay = (val: number) => {
    if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Crores`;
    if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)} Lakhs`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border-accent)',
            }}>
              <Building2 size={22} color="var(--accent-indigo)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Configure Corporate Portfolio
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Customize institutional capital size, target asset weights, and risk aversion ($\lambda$).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 6, borderRadius: 8,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="alert-item critical" style={{ marginBottom: 16 }}>
            <AlertCircle size={18} color="var(--accent-rose)" />
            <span style={{ fontSize: '0.85rem' }}>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Company Name & Total Capital Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">
                Company / Fund Name
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Adani Capital Treasury"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Capital Pool</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                  {formatCapitalDisplay(capital)}
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontWeight: 600,
                }}>
                  ₹
                </span>
                <input
                  type="number"
                  min="100000"
                  step="100000"
                  className="form-input"
                  style={{ paddingLeft: 28 }}
                  value={capital}
                  onChange={e => setCapital(Number(e.target.value) || 0)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Capital Quick-Select Chips */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Capital:</span>
            {CAPITAL_CHIPS.map(chip => (
              <button
                type="button"
                key={chip.label}
                className={`chip-btn ${capital === chip.value ? 'active' : ''}`}
                onClick={() => setCapital(chip.value)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Institutional Presets */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Sparkles size={15} color="var(--accent-amber)" />
              <span className="form-label" style={{ margin: 0 }}>Institutional Allocation Presets</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {PRESETS.map(p => (
                <button
                  type="button"
                  key={p.name}
                  className="preset-card"
                  onClick={() => handleApplyPreset(p)}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', margin: '2px 0 4px 0' }}>
                    {p.tag}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {p.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Asset Allocation Sliders */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
            borderRadius: 14, padding: '16px 18px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sliders size={16} color="var(--accent-indigo)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Target Asset Allocation</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 700,
                  padding: '4px 10px', borderRadius: 20,
                  background: isValidSum ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isValidSum ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                  border: `1px solid ${isValidSum ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {isValidSum ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  Total: {roundedSum.toFixed(1)}%
                </span>
                {!isValidSum && (
                  <button
                    type="button"
                    onClick={handleAutoBalance}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', gap: 4 }}
                  >
                    <RefreshCw size={12} /> Auto-Balance to 100%
                  </button>
                )}
              </div>
            </div>

            {/* Allocation Visual Bar */}
            <div style={{
              height: 8, width: '100%', borderRadius: 4, overflow: 'hidden',
              display: 'flex', background: 'rgba(255,255,255,0.05)', marginBottom: 16,
            }}>
              {ASSET_CONFIG.map(a => {
                const w = weights[a.symbol] || 0;
                if (w <= 0) return null;
                return (
                  <div
                    key={a.symbol}
                    style={{
                      width: `${Math.min(100, w)}%`,
                      background: a.color,
                      transition: 'width 0.3s ease',
                    }}
                    title={`${a.name}: ${w}%`}
                  />
                );
              })}
            </div>

            {/* Sliders List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ASSET_CONFIG.map(a => {
                const currentWeight = weights[a.symbol] ?? 0;
                const assetCapital = (capital * currentWeight) / 100;
                return (
                  <div key={a.symbol} style={{
                    display: 'grid', gridTemplateColumns: '180px 1fr 75px',
                    gap: 14, alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: a.color }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{a.name.split(' ')[0]}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({a.symbol})</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 18 }}>
                        {formatCurrency(assetCapital)}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={currentWeight}
                      onChange={e => handleWeightChange(a.symbol, parseFloat(e.target.value))}
                      style={{
                        accentColor: a.color,
                        cursor: 'pointer',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={currentWeight}
                        onChange={e => handleWeightChange(a.symbol, parseFloat(e.target.value) || 0)}
                        style={{
                          width: 58, padding: '4px 6px', textAlign: 'right',
                          borderRadius: 6, background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)', color: 'var(--text-primary)',
                          fontFamily: 'monospace', fontSize: '0.85rem',
                        }}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Tolerance (Lambda) */}
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
            borderRadius: 14, padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="form-label" style={{ margin: 0 }}>
                Risk Aversion Penalty Parameter ($\lambda$)
              </span>
              <span style={{
                fontFamily: 'monospace', fontWeight: 700,
                color: lambda <= 0.8 ? 'var(--accent-rose)' : lambda <= 1.5 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
              }}>
                $\lambda = {lambda.toFixed(2)}$
                <span style={{ fontSize: '0.75rem', marginLeft: 6, fontWeight: 400 }}>
                  ({lambda <= 0.8 ? 'Aggressive Growth' : lambda <= 1.5 ? 'Balanced' : 'Conservative Treasury'})
                </span>
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={lambda}
              onChange={e => setLambda(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-indigo)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <span>0.1 (High Risk Tolerance / Maximum Return)</span>
              <span>1.0 (Standard Markowitz)</span>
              <span>5.0 (Strict Risk Aversion / Capital Guard)</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'flex-end',
            paddingTop: 8, borderTop: '1px solid var(--border-subtle)',
          }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '10px 20px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isValidSum || submitting}
              style={{
                padding: '10px 24px',
                gap: 8,
                opacity: !isValidSum ? 0.5 : 1,
              }}
            >
              {submitting ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  Recalculating Risk...
                </>
              ) : (
                <>
                  <Building2 size={16} />
                  Apply & Recalculate Portfolio
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
