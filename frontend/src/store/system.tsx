/* Shared system state.

   All five views read one control-loop state, which is what makes them a
   single product rather than five pages: a scenario run in the Stress Studio
   raises the pending recommendation that the Executive Overview reports and
   the Execution Ledger records. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "../api";
import type {
  OptimizationRecord,
  Portfolio,
  RebalanceRecord,
  RiskResponse,
  Scenario,
  ScenarioRunResponse,
} from "../types";
import { asRegime, type Regime } from "../lib/regime";
import { buildExposure, type AssetClass, type Exposure } from "../lib/exposure";

interface SystemData {
  portfolio: Portfolio;
  risk: RiskResponse;
  scenarios: Scenario[];
  history: RebalanceRecord[];
  optimizations: OptimizationRecord[];
}

interface SystemValue {
  status: "loading" | "ready" | "error";
  error: string | null;
  data: SystemData | null;
  /** Live regime driving the accent colour of the whole interface. */
  regime: Regime;
  /** Sleeve-level exposure derived from live class weights. */
  exposure: Exposure | null;
  /** Result of the most recent scenario run, shared across views. */
  lastRun: ScenarioRunResponse | null;
  setLastRun: (run: ScenarioRunResponse | null) => void;
  /** Whether that run's recommendation has been acted on. */
  lastRunDecision: "approved" | "rejected" | null;
  setLastRunDecision: (decision: "approved" | "rejected" | null) => void;
  refresh: () => Promise<void>;
  refreshing: boolean;
  toast: string | null;
  notify: (message: string) => void;
}

const SystemContext = createContext<SystemValue | null>(null);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SystemData | null>(null);
  const [lastRun, setLastRunState] = useState<ScenarioRunResponse | null>(null);
  const [lastRunDecision, setLastRunDecision] = useState<"approved" | "rejected" | null>(null);

  // A new run always starts undecided.
  const setLastRun = useCallback((run: ScenarioRunResponse | null) => {
    setLastRunState(run);
    setLastRunDecision(null);
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setStatus("loading");
    setError(null);
    try {
      const [portfolio, risk, scenarios, history, optimizations] = await Promise.all([
        api.getPortfolio(),
        api.getRisk(),
        api.getScenarios(),
        // History is supporting detail: never fail the whole app over it.
        api.getRebalanceHistory().catch(() => [] as RebalanceRecord[]),
        api.getOptimizations().catch(() => [] as OptimizationRecord[]),
      ]);
      setData({ portfolio, risk, scenarios, history, optimizations });
      setStatus("ready");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Unexpected error loading system state.");
      setStatus("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const regime = asRegime(data?.risk.metrics.risk_level);

  // Bind the regime to the document so every surface can read var(--regime).
  useEffect(() => {
    document.documentElement.dataset.regime = regime;
  }, [regime]);

  const exposure = useMemo(() => {
    if (!data) return null;
    const classWeights: Partial<Record<AssetClass, number>> = {};
    data.portfolio.holdings.forEach((h) => {
      const symbol = h.asset?.symbol as AssetClass | undefined;
      if (symbol) classWeights[symbol] = h.weight;
    });
    return buildExposure(classWeights, data.portfolio.total_capital);
  }, [data]);

  const value = useMemo<SystemValue>(
    () => ({
      status,
      error,
      data,
      regime,
      exposure,
      lastRun,
      setLastRun,
      lastRunDecision,
      setLastRunDecision,
      refresh: () => load(true),
      refreshing,
      toast,
      notify,
    }),
    [
      status,
      error,
      data,
      regime,
      exposure,
      lastRun,
      setLastRun,
      lastRunDecision,
      load,
      refreshing,
      toast,
      notify,
    ],
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystem(): SystemValue {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error("useSystem must be used inside <SystemProvider>");
  return ctx;
}

/** Narrowed accessor for views that only render once data is present. */
export function useReadySystem() {
  const ctx = useSystem();
  if (!ctx.data || !ctx.exposure) throw new Error("System data not ready");
  return { ...ctx, data: ctx.data, exposure: ctx.exposure };
}
