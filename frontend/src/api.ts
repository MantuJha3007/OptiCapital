/* API client for the OptiCapital backend.

   Requests are proxied to http://localhost:8000 by vite.config.ts, so the
   frontend needs no base URL or CORS configuration in development. */

import type {
  OptimizationRecord,
  OptimizationResult,
  Portfolio,
  RebalanceOutcome,
  RebalanceRecord,
  RiskResponse,
  Scenario,
  ScenarioRunResponse,
} from "./types";

const BASE = "/api";

const UNREACHABLE =
  "The OptiCapital engine is not responding. Start the backend, then retry.";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${url}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError(UNREACHABLE, 0);
  }

  // The dev proxy answers with a gateway error rather than a network failure
  // when the API is not running, so those statuses mean the same thing to the
  // reader as a dropped connection.
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new ApiError(UNREACHABLE, res.status);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(body?.detail || res.statusText || "Request failed", res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ status: string; database: string }>("/health"),

  getPortfolio: () => request<Portfolio>("/portfolio"),

  getRisk: () => request<RiskResponse>("/risk"),

  getScenarios: () => request<Scenario[]>("/scenarios"),

  runScenario: (scenarioId: string) =>
    request<ScenarioRunResponse>("/scenarios/run", {
      method: "POST",
      body: JSON.stringify({ scenario_id: scenarioId }),
    }),

  optimize: (riskAversion?: number) =>
    request<OptimizationResult>("/optimize", {
      method: "POST",
      body: JSON.stringify({ risk_aversion: riskAversion }),
    }),

  rebalance: (optimizationId: string, approved: boolean) =>
    request<RebalanceOutcome>("/rebalance", {
      method: "POST",
      body: JSON.stringify({ optimization_id: optimizationId, approved }),
    }),

  getRebalanceHistory: () => request<RebalanceRecord[]>("/rebalance/history"),

  getOptimizations: () => request<OptimizationRecord[]>("/optimization"),
};
