/* API client for the Smart Capital Guard backend */

import type {
  Portfolio,
  RiskResponse,
  Scenario,
  ScenarioRunResponse,
  CustomPortfolioPayload,
  ReverseStressResult,
  RebalanceHistoryItem,
  AEGISMasterState,
  RiskAttributionResponse,
  CopilotAssessment,
  MarketProviderStatus,
  DocumentItem,
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

  runReverseStress: (lossThresholdPct: number = 0.10) =>
    request<ReverseStressResult>('/scenarios/reverse-stress', {
      method: 'POST',
      body: JSON.stringify({ loss_threshold_pct: lossThresholdPct }),
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

  saveCustomPortfolio: (payload: CustomPortfolioPayload) =>
    request<{ portfolio: Portfolio; risk: RiskResponse }>('/portfolio/custom', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetToDemo: () =>
    request<{ portfolio: Portfolio; risk: RiskResponse }>('/portfolio/custom', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Aegis Institutional Benchmark',
        total_capital: 10000000,
        risk_aversion: 2.5,
        holdings: [
          { symbol: 'EQUITY', weight: 0.40 },
          { symbol: 'GOV_BONDS', weight: 0.25 },
          { symbol: 'CORP_BONDS', weight: 0.15 },
          { symbol: 'GOLD', weight: 0.10 },
          { symbol: 'CASH', weight: 0.10 },
        ],
      }),
    }),

  getRebalanceHistory: () => request<RebalanceHistoryItem[]>('/rebalance/history'),

  getMasterState: () => request<AEGISMasterState>('/state/master'),

  getRiskAttribution: () => request<RiskAttributionResponse>('/risk/attribution'),

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
    request<CopilotAssessment>('/risk-manager/chat', {
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
    request<MarketProviderStatus>('/market/provider'),

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
    request<{ total_documents: number; total_chunks: number; documents: DocumentItem[] }>('/documents'),

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
};


