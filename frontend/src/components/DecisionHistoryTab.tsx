import { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { api } from '../api';
import type { RebalanceHistoryItem } from '../types';
import { RiskTrajectory } from './viz/RiskTrajectory';

interface DecisionHistoryTabProps {
  onRefresh?: () => void;
}

function formatCurrency(val: number): string {
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export function DecisionHistoryTab({ onRefresh }: DecisionHistoryTabProps) {
  const [history, setHistory] = useState<RebalanceHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected'>('all');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getRebalanceHistory();
      setHistory(data);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to load rebalance history:', err);
    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((item) => {
    if (filter === 'approved') return item.approved;
    if (filter === 'rejected') return !item.approved;
    return true;
  });

  return (
    <div className="decision-history-page">
      {/* Banner */}
      <div className="tab-banner">
        <div className="tab-banner-content">
          <div className="tab-title-row">
            <History className="tab-icon text-indigo-400" size={24} />
            <h2>Explainable Decision History & Governance Audit Trail</h2>
          </div>
          <p className="tab-description">
            Complete cryptographic audit trail of the <strong>Detect → Diagnose → Decide → Defend → Learn</strong>{' '}
            governance loop. Records every market alert, rule-engine constraint alteration, optimizer proposal, and
            human approval signature.
          </p>
        </div>

        {/* Filter & Refresh Controls */}
        <div className="history-filter-bar">
          <div className="filter-pill-group">
            <button
              className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Events ({history.length})
            </button>
            <button
              className={`filter-pill ${filter === 'approved' ? 'active' : ''}`}
              onClick={() => setFilter('approved')}
            >
              Approved
            </button>
            <button
              className={`filter-pill ${filter === 'rejected' ? 'active' : ''}`}
              onClick={() => setFilter('rejected')}
            >
              Rejected
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchHistory} disabled={loading}>
            <RotateCcw size={14} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Risk Trajectory Chart across Decision History */}
      {history.length >= 2 && (
        <div className="card p-5 mb-6 border border-slate-800 bg-slate-900/60 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-cyan-400" />
                Intervention Trajectory & Envelope De-escalation
              </h3>
              <p className="text-xs text-slate-400">
                Audits risk score before (dashed) vs. after recommendation across historical rebalances plotted over regime bands.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {history.length} logged events
            </span>
          </div>
          <RiskTrajectory history={history} />
        </div>
      )}

      {/* Audit Timeline */}
      <div className="timeline-container">
        {loading ? (
          <div className="timeline-empty-card card">
            <Clock className="animate-spin text-indigo-400 mb-2" size={24} />
            <p>Loading institutional audit logs from PostgreSQL...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="timeline-empty-card card">
            <FileText className="text-slate-500 mb-3" size={32} />
            <h4>No Governance Decisions Logged Yet</h4>
            <p className="text-slate-400 text-sm max-w-md text-center">
              When you simulate a stress test or execute an automated defensive rebalance, each step of the rule engine
              and human officer sign-off will appear here in chronological order.
            </p>
          </div>
        ) : (
          <div className="timeline-list">
            {filteredHistory.map((item, idx) => {
              const dateStr = new Date(item.created_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div key={item.id || idx} className="timeline-item">
                  <div className="timeline-line"></div>
                  <div className={`timeline-marker ${item.approved ? 'approved' : 'rejected'}`}>
                    {item.approved ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </div>

                  <div className="timeline-card card">
                    <div className="timeline-card-header">
                      <div className="flex-center gap-2">
                        <span
                          className={`badge-pill ${
                            item.approved ? 'safe' : 'danger'
                          }`}
                        >
                          {item.approved ? 'APPROVED & EXECUTED' : 'REJECTED BY RISK OFFICER'}
                        </span>
                        <span className="timeline-action-name">{item.action}</span>
                      </div>
                      <div className="timeline-date">
                        <Clock size={12} />
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    <p className="timeline-reason">{item.reason || 'Routine portfolio optimization triggered.'}</p>

                    <div className="timeline-metrics-strip">
                      {item.risk_before !== null && item.risk_after !== null && (
                        <div className="metric-chip">
                          <span className="label">Risk Delta:</span>
                          <strong>
                            {item.risk_before?.toFixed(0)} → {item.risk_after?.toFixed(0)} pts
                          </strong>
                        </div>
                      )}
                      {item.transaction_cost !== null && (
                        <div className="metric-chip">
                          <span className="label">Transaction Cost:</span>
                          <strong>{formatCurrency(item.transaction_cost)}</strong>
                        </div>
                      )}
                      <div className="metric-chip">
                        <span className="label">Action ID:</span>
                        <code className="text-xs text-slate-400">{item.id.substring(0, 8)}...</code>
                      </div>
                    </div>

                    {/* 5-Phase Audit Trail Breakdown */}
                    <div className="governance-stages-box">
                      <div className="stage-pill">
                        <span className="num">1</span>
                        <span className="txt">Detect: Vol Spike</span>
                      </div>
                      <span className="stage-arrow">→</span>
                      <div className="stage-pill">
                        <span className="num">2</span>
                        <span className="txt">Diagnose: Buffer Breach</span>
                      </div>
                      <span className="stage-arrow">→</span>
                      <div className="stage-pill">
                        <span className="num">3</span>
                        <span className="txt">Decide: Tighten Caps</span>
                      </div>
                      <span className="stage-arrow">→</span>
                      <div className="stage-pill">
                        <span className="num">4</span>
                        <span className="txt">Defend: HRP Rebalance</span>
                      </div>
                      <span className="stage-arrow">→</span>
                      <div className="stage-pill active">
                        <span className="num">5</span>
                        <span className="txt">Learn: {item.approved ? 'Signed Off' : 'Dismissed'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
