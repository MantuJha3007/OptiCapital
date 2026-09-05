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

  getMasterState: () => request<import('./types').AEGISMasterState>('/state/master'),

  getRiskAttribution: () => request<import('./types').RiskAttributionResponse>('/risk/attribution'),

  runReverseStress: (failureThreshold = 80.0, weightsOverride?: Record<string, number>) =>
    request<import('./types').ReverseStressResponse>('/stress/reverse', {
      method: 'POST',
      body: JSON.stringify({
        failure_threshold_score: failureThreshold,
        weights_override: weightsOverride,
      }),
    }),

  getMarketRegime: () => request<any>('/market/regime'),

  getMarketContagion: (isStressed = false) =>
    request<any>(`/market/contagion?is_stressed=${isStressed}`),

  queryRAG: (query: string, topK = 3) =>
    request<any[]>('/rag/query', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK }),
    }),

  chatCopilot: (
    query?: string,
    screenContext: any = 'COMMAND_CENTER',
    conversationHistory?: Array<{ role: string; content: string }>
  ) =>
    request<import('./types').CopilotAssessment>('/risk-manager/chat', {
      method: 'POST',
      body: JSON.stringify({
        query,
        screen_context: screenContext,
        conversation_history: conversationHistory,
      }),
    }),

  getCopilotContext: () =>
    request<any>('/copilot/context'),

  getMarketProvider: () =>
    request<import('./types').MarketProviderStatus>('/market/provider'),

  switchMarketProvider: (provider: string) =>
    request<any>('/market/provider', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),

  uploadMarketCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/market/upload-csv', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  getMarketHistory: (lookbackDays = 60) =>
    request<any>(`/market/history?lookback_days=${lookbackDays}`),

  getDocuments: () =>
    request<{ total_documents: number; total_chunks: number; documents: import('./types').DocumentItem[] }>('/documents'),

  uploadDocument: async (file: File, documentType = 'COMPANY_POLICY') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  deleteDocument: (docId: string) =>
    request<any>(`/documents/${docId}`, { method: 'DELETE' }),

  getDecisionOutcomes: () =>
    request<import('./types').DecisionOutcomeItem[]>('/audit/outcomes'),

  resetPortfolio: () =>
    request<any>('/portfolio/reset', { method: 'POST' }),

  updatePortfolio: (totalCapital?: number, weights?: Record<string, number>) =>
    request<any>('/portfolio/update', {
      method: 'POST',
      body: JSON.stringify({ total_capital: totalCapital, weights }),
    }),
};
