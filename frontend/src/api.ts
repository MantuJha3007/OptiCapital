/* API client for the Smart Capital Guard backend */

import type {
  Portfolio,
  RiskResponse,
  Scenario,
  ScenarioRunResponse,
} from './types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string; database: string }>('/health'),

  getPortfolio: () => request<Portfolio>('/portfolio'),

  getRisk: () => request<RiskResponse>('/risk'),

  getScenarios: () => request<Scenario[]>('/scenarios'),

  runScenario: (scenarioId: string) =>
    request<ScenarioRunResponse>('/scenarios/run', {
      method: 'POST',
      body: JSON.stringify({ scenario_id: scenarioId }),
    }),

  optimize: (riskAversion?: number) =>
    request<any>('/optimize', {
      method: 'POST',
      body: JSON.stringify({ risk_aversion: riskAversion }),
    }),

  rebalance: (optimizationId: string, approved: boolean) =>
    request<any>('/rebalance', {
      method: 'POST',
      body: JSON.stringify({ optimization_id: optimizationId, approved }),
    }),

  getRebalanceHistory: () => request<any[]>('/rebalance/history'),
};
