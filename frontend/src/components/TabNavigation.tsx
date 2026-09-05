import { Shield, BarChart3, Activity, Zap, History } from 'lucide-react';

export type DashboardTab =
  | 'command-center'
  | 'portfolio-intelligence'
  | 'contagion-network'
  | 'stress-lab'
  | 'decision-history';

interface TabNavigationProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  riskLevel?: string;
  hasPendingAlert?: boolean;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  riskLevel = 'SAFE',
  hasPendingAlert = false,
}: TabNavigationProps) {
  const tabs: { id: DashboardTab; label: string; icon: typeof Shield; badge?: string }[] = [
    {
      id: 'command-center',
      label: 'Executive Command Center',
      icon: Shield,
      badge: riskLevel,
    },
    {
      id: 'portfolio-intelligence',
      label: 'Portfolio Intelligence',
      icon: BarChart3,
    },
    {
      id: 'contagion-network',
      label: 'Risk & Contagion',
      icon: Activity,
    },
    {
      id: 'stress-lab',
      label: 'Stress & Reverse Stress Lab',
      icon: Zap,
      badge: 'WOW',
    },
    {
      id: 'decision-history',
      label: 'Decision History & Governance',
      icon: History,
      badge: hasPendingAlert ? '1' : undefined,
    },
  ];

  return (
    <nav className="tab-navigation-bar">
      <div className="tab-navigation-container">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(t.id)}
            >
              <Icon size={18} className="tab-btn-icon" />
              <span className="tab-btn-label">{t.label}</span>
              {t.badge && (
                <span
                  className={`tab-btn-badge ${
                    t.badge === 'WOW'
                      ? 'wow'
                      : t.badge.toLowerCase()
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
