/* Application shell.

   The navigation is not a menu of features, it is the control loop in
   order — observe, attribute, connect, test, record. The step numbers and
   the persistent status strip are what make five routes read as one
   system: wherever you are, the live regime and the outstanding decision
   travel with you. */

import { NavLink, useLocation } from "react-router-dom";
import {
  FlaskConical,
  Network,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useSystem } from "../../store/system";
import { RegimePill, Spinner } from "../ui/primitives";
import { inr } from "../../lib/format";

interface NavItem {
  to: string;
  label: string;
  short: string;
  step: string;
  icon: LucideIcon;
  question: string;
}

const NAV: NavItem[] = [
  {
    to: "/",
    label: "Overview",
    short: "Overview",
    step: "01",
    icon: ShieldCheck,
    question: "Is the portfolio operating safely?",
  },
  {
    to: "/risk",
    label: "Risk Attribution",
    short: "Risk",
    step: "02",
    icon: Target,
    question: "Where is the risk coming from?",
  },
  {
    to: "/contagion",
    label: "Contagion",
    short: "Network",
    step: "03",
    icon: Network,
    question: "What is connected to what?",
  },
  {
    to: "/stress",
    label: "Stress Studio",
    short: "Stress",
    step: "04",
    icon: FlaskConical,
    question: "What breaks us, and what then?",
  },
  {
    to: "/ledger",
    label: "Execution Ledger",
    short: "Ledger",
    step: "05",
    icon: ScrollText,
    question: "What did we decide, and why?",
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data, regime, refresh, refreshing, lastRun, lastRunDecision, toast } = useSystem();
  const location = useLocation();
  const active = NAV.find((n) => n.to === location.pathname) ?? NAV[0];

  const pending =
    lastRun && lastRun.recommendation.action !== "HOLD" && !lastRunDecision
      ? lastRun.recommendation.action
      : null;

  return (
    <div className="min-h-full flex flex-col bg-ink-900">
      {/* ── Status strip ─────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center gap-4 px-4 lg:px-5 h-14 border-b hair"
        style={{ background: "color-mix(in srgb, var(--color-ink-950) 88%, transparent)", backdropFilter: "blur(10px)" }}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <Mark />
          <div className="leading-tight hidden sm:block">
            <div className="text-[13px] font-semibold tracking-tight">OptiCapital</div>
            <div className="text-[9.5px] uppercase tracking-[0.11em] text-fg-3">
              Capital Resilience Control
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-[var(--color-line-soft)] hidden md:block" aria-hidden />

        {/* Live condition — always visible, on every route */}
        <div className="flex items-center gap-4 lg:gap-5 min-w-0 flex-1 overflow-hidden">
          {data ? (
            <>
              <RegimePill regime={regime} />
              <StatusFigure label="Score" value={data.risk.metrics.risk_score.toFixed(1)} accent />
              <StatusFigure
                label="Capital"
                value={inr(data.portfolio.total_capital)}
                className="hidden md:flex"
              />
              <StatusFigure
                label="Volatility"
                value={`${(data.risk.metrics.volatility * 100).toFixed(1)}%`}
                className="hidden lg:flex"
              />
              <div className="hidden xl:flex items-center gap-2 min-w-0">
                <span className="label">Posture</span>
                {pending ? (
                  <span className="text-[11.5px] font-semibold text-[var(--regime)] truncate">
                    {pending.replace(/_/g, " ")} pending
                  </span>
                ) : (
                  <span className="text-[11.5px] text-fg-2 truncate">No action required</span>
                )}
              </div>
            </>
          ) : (
            <span className="text-[11.5px] text-fg-3">Connecting to engine…</span>
          )}
        </div>

        <button
          className="btn btn-quiet shrink-0"
          onClick={() => void refresh()}
          disabled={refreshing}
          title="Re-read portfolio and recompute risk"
        >
          {refreshing ? <Spinner size={12} /> : <RefreshCw size={13} />}
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── Rail ───────────────────────────────────────────────────── */}
        <nav
          className="hidden md:flex flex-col shrink-0 border-r hair w-[60px] lg:w-[212px] py-3 gap-0.5 px-2"
          aria-label="Control loop"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={`${item.label} — ${item.question}`}
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 rounded px-2.5 py-2 transition-colors ${
                  isActive ? "text-fg" : "text-fg-3 hover:text-fg-2 hover:bg-ink-850"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: "rgb(var(--regime-rgb) / 0.11)" }
                  : undefined
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                      style={{ background: "var(--regime)" }}
                      aria-hidden
                    />
                  )}
                  <item.icon
                    size={15}
                    className="shrink-0"
                    style={isActive ? { color: "var(--regime)" } : undefined}
                  />
                  <span className="hidden lg:flex items-baseline gap-1.5 min-w-0">
                    <span className="num text-[9.5px] text-fg-3">{item.step}</span>
                    <span className="text-[12.5px] font-medium truncate">{item.label}</span>
                  </span>
                </>
              )}
            </NavLink>
          ))}

          <div className="mt-auto hidden lg:block px-2.5 pt-4">
            <p className="text-[10.5px] leading-relaxed text-fg-3">
              Keep capital inside the envelope. Intervene only when necessary, and only as much
              as necessary.
            </p>
          </div>
        </nav>

        {/* ── Content ────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-x-hidden pb-16 md:pb-0">
          <div className="px-4 lg:px-6 pt-5 pb-3">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="num text-[11px] text-fg-3">{active.step}</span>
              <h1 className="text-[17px] font-semibold tracking-tight">{active.label}</h1>
              <span className="text-[12px] text-fg-3">{active.question}</span>
            </div>
          </div>
          <div className="px-4 lg:px-6 pb-8">{children}</div>
        </main>
      </div>

      {/* ── Mobile tab bar ───────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 flex border-t hair"
        style={{ background: "var(--color-ink-950)" }}
        aria-label="Control loop"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 ${
                isActive ? "text-[var(--regime)]" : "text-fg-3"
              }`
            }
          >
            <item.icon size={16} />
            <span className="text-[9.5px] font-medium">{item.short}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Toast ────────────────────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="rise fixed z-40 bottom-20 md:bottom-5 right-4 left-4 md:left-auto md:max-w-sm panel px-4 py-3 text-[12.5px]"
          style={{ borderColor: "rgb(var(--regime-rgb) / 0.4)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function StatusFigure({
  label,
  value,
  accent,
  className = "",
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-1.5 shrink-0 ${className}`}>
      <span className="label">{label}</span>
      <span
        className="num text-[13px] font-semibold"
        style={accent ? { color: "var(--regime)" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/* Product mark: a shield whose fill level is the live regime. */
function Mark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2.5 4.5 6v6.2c0 4.6 3.2 8.2 7.5 9.3 4.3-1.1 7.5-4.7 7.5-9.3V6L12 2.5Z"
        stroke="var(--regime)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.6 8 8.5v3.9c0 2.6 1.7 4.6 4 5.3 2.3-.7 4-2.7 4-5.3V8.5L12 6.6Z"
        fill="var(--regime)"
        fillOpacity="0.22"
      />
      <path d="M9.4 12.2 11.3 14l3.4-3.6" stroke="var(--regime)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
