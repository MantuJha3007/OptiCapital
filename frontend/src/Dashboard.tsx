import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
} from 'lucide-react';

import { api } from './api';
import type { Portfolio, RiskResponse, Scenario } from './types';
import { PortfolioConfigModal } from './PortfolioConfigModal';
import { TabNavigation, type DashboardTab } from './components/TabNavigation';
import { CommandCenterTab } from './components/CommandCenterTab';
import { PortfolioIntelligenceTab } from './components/PortfolioIntelligenceTab';
import { ContagionNetwork } from './components/ContagionNetwork';
import { StressTestingLabTab } from './components/StressTestingLabTab';
import { DecisionHistoryTab } from './components/DecisionHistoryTab';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('command-center');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [risk, setRisk] = useState<RiskResponse | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // Load initial backend data
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
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Aegis API backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Reset to Demo Benchmark (Canonical ₹1 Crore Portfolio)
  const handleResetDemo = async () => {
    try {
      const res = await api.resetToDemo();
      setPortfolio(res.portfolio);
      setRisk(res.risk);
      setToast('✓ Restored Aegis canonical ₹1.00 Cr benchmark portfolio!');
    } catch (err: any) {
      setToast(`Reset failed: ${err.message}`);
    }
  };

  // Run One-Click Defensive Optimization
  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const optRes = await api.optimize();
      if (optRes.optimization_id) {
        await api.rebalance(optRes.optimization_id, true);
        await loadData();
        setToast('✓ Autonomous defensive optimization executed on active ledger!');
      }
    } catch (err: any) {
      setToast(`Optimization failed: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', justifyContent: 'center', gap: 12 }}>
        <div className="spinner"></div>
        <span style={{ color: 'var(--text-secondary)' }}>
          Booting Aegis Capital Guard & Loading Risk Engine...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex-center"
        style={{
          height: '100vh',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
        }}
      >
        <AlertTriangle size={48} color="var(--accent-rose)" />
        <h2>Connection Error</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 460, textAlign: 'center' }}>
          {error}
        </p>
        <button className="btn btn-primary" onClick={loadData}>
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    );
  }

  const riskLevel = risk?.metrics?.risk_level || 'SAFE';

  return (
    <div className="app-layout">
      {/* ─── Top Global Navigation Bar ─── */}
      <header className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="logo-box">
              <Shield size={22} color="#ffffff" />
            </div>
            <div>
              <div className="brand-title">
                AEGIS <span className="brand-tag">CAPITAL GUARD</span>
              </div>
              <div className="brand-sub">See the shock before it lands.</div>
            </div>
          </div>

          <div className="nav-actions">
            {/* Real-time system pulse */}
            <div className="system-status-indicator">
              <span className="pulse-dot"></span>
              <span className="system-status-text">ENGINE ONLINE</span>
            </div>

            {/* Active portfolio name chip */}
            <div className="portfolio-badge">
              <Building2 size={15} />
              <span>{portfolio?.name || 'Aegis Treasury'}</span>
            </div>

            {/* Benchmark reset */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleResetDemo}
              title="Reset to Aegis Benchmark (₹1 Cr, 5 Assets)"
            >
              <RotateCcw size={14} />
              Reset Demo
            </button>

            {/* Company portfolio configurator */}
            <button className="btn btn-primary btn-sm" onClick={() => setConfigModalOpen(true)}>
              <Sliders size={14} />
              Configure Company
            </button>
          </div>
        </div>
      </header>

      {/* ─── 5-Tab Navigation Bar ─── */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        riskLevel={riskLevel}
        hasPendingAlert={riskLevel === 'CRISIS' || riskLevel === 'STRESS'}
      />

      {/* ─── Main Content Canvas ─── */}
      <main className="main-content">
        {/* Tab 1: Executive Command Center */}
        {activeTab === 'command-center' && (
          <CommandCenterTab
            portfolio={portfolio}
            riskMetrics={risk?.metrics || null}
            onOpenConfig={() => setConfigModalOpen(true)}
            onResetDemo={handleResetDemo}
            onNavigateToStress={() => setActiveTab('stress-lab')}
            onOptimize={handleOptimize}
            isOptimizing={isOptimizing}
          />
        )}

        {/* Tab 2: Portfolio Intelligence */}
        {activeTab === 'portfolio-intelligence' && (
          <PortfolioIntelligenceTab
            portfolio={portfolio}
            riskMetrics={risk?.metrics || null}
          />
        )}

        {/* Tab 3: Risk & Contagion Lab */}
        {activeTab === 'contagion-network' && (
          <ContagionNetwork
            portfolio={portfolio}
            riskMetrics={risk?.metrics || null}
          />
        )}

        {/* Tab 4: Stress & Reverse Stress Lab */}
        {activeTab === 'stress-lab' && (
          <StressTestingLabTab
            portfolio={portfolio}
            riskMetrics={risk?.metrics || null}
            scenarios={scenarios}
            onRebalanceSuccess={loadData}
          />
        )}

        {/* Tab 5: Decision History & Governance */}
        {activeTab === 'decision-history' && (
          <DecisionHistoryTab onRefresh={loadData} />
        )}
      </main>

      {/* ─── Company Portfolio Config Modal ─── */}
      {portfolio && (
        <PortfolioConfigModal
          isOpen={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          currentPortfolio={portfolio}
          onSaveSuccess={(data) => {
            setPortfolio(data.portfolio);
            setRisk(data.risk);
            setConfigModalOpen(false);
            setToast(`✓ Successfully loaded "${data.portfolio.name}"! Metrics recomputed.`);
          }}
        />
      )}

      {/* ─── Floating Toast Notification ─── */}
      {toast && (
        <div className="floating-toast">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
