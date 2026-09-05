import React, { useState, useEffect } from 'react';
import { api } from './api';
import type { MarketProviderStatus, DocumentItem } from './types';

interface DataCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStateRefresh: () => void;
}

export const DataCenterModal: React.FC<DataCenterModalProps> = ({ isOpen, onClose, onStateRefresh }) => {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'DOCUMENTS'>('MARKET');

  // Market Data state
  const [providerStatus, setProviderStatus] = useState<MarketProviderStatus | null>(null);
  const [marketHistory, setMarketHistory] = useState<any>(null);
  const [marketUploading, setMarketUploading] = useState<boolean>(false);
  const [marketMsg, setMarketMsg] = useState<string>('');

  // Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [docUploading, setDocUploading] = useState<boolean>(false);
  const [docMsg, setDocMsg] = useState<string>('');
  const [docType, setDocType] = useState<string>('COMPANY_POLICY');

  // RAG Search test state
  const [ragQuery, setRagQuery] = useState<string>('');
  const [ragResults, setRagResults] = useState<any[]>([]);
  const [ragSearching, setRagSearching] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadMarketStatus();
      loadDocuments();
    }
  }, [isOpen]);

  const loadMarketStatus = async () => {
    try {
      const status = await api.getMarketProvider();
      setProviderStatus(status);
      const history = await api.getMarketHistory(30);
      setMarketHistory(history);
    } catch (err: any) {
      console.error('Failed to load market status:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data.documents || []);
      setTotalChunks(data.total_chunks || 0);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    }
  };

  const handleSwitchProvider = async (providerName: string) => {
    try {
      await api.switchMarketProvider(providerName);
      setMarketMsg(`Market provider switched to ${providerName.toUpperCase()}`);
      await loadMarketStatus();
      onStateRefresh();
    } catch (err: any) {
      setMarketMsg(`Error: ${err.message}`);
    }
  };

  const handleUploadCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMarketUploading(true);
    setMarketMsg('');
    try {
      const res = await api.uploadMarketCSV(file);
      setMarketMsg(`Success: ${res.message}`);
      await loadMarketStatus();
      onStateRefresh();
    } catch (err: any) {
      setMarketMsg(`Upload Error: ${err.message}`);
    } finally {
      setMarketUploading(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocUploading(true);
    setDocMsg('');
    try {
      const res = await api.uploadDocument(file, docType);
      setDocMsg(`Indexed ${file.name} successfully into ${res.document?.chunk_count || 0} chunks.`);
      await loadDocuments();
      onStateRefresh();
    } catch (err: any) {
      setDocMsg(`Document Error: ${err.message}`);
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Remove this document from the Knowledge Base?')) return;
    try {
      await api.deleteDocument(docId);
      await loadDocuments();
      onStateRefresh();
    } catch (err: any) {
      setDocMsg(`Delete Error: ${err.message}`);
    }
  };

  const handleSearchRAG = async () => {
    if (!ragQuery.trim()) return;
    setRagSearching(true);
    try {
      const res: any = await api.queryRAG(ragQuery, 3);
      setRagResults(Array.isArray(res) ? res : res.results || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setRagSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '840px',
          maxWidth: '100%',
          maxHeight: '90vh',
          background: '#0f172a',
          borderRadius: '16px',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                AEGIS Data Center & Knowledge Base
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Configure market feeds and upload institutional policy documents (PDF, DOCX, TXT)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: '#0f172a',
            borderBottom: '1px solid #334155',
            padding: '0 24px',
          }}
        >
          <button
            onClick={() => setActiveTab('MARKET')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'MARKET' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'MARKET' ? '#10b981' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            📊 Market Data Feeds ({providerStatus?.active_provider?.toUpperCase() || 'DEMO'})
          </button>
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'DOCUMENTS' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'DOCUMENTS' ? '#38bdf8' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            📁 Company Knowledge Base ({documents.length} Docs / {totalChunks} Chunks)
          </button>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {activeTab === 'MARKET' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Provider Selection Card */}
              <div
                style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '18px',
                  border: '1px solid #334155',
                }}
              >
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#f8fafc' }}>
                  Active Feed Provider
                </h3>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                  {['demo', 'csv', 'live'].map((prov) => {
                    const isSelected = providerStatus?.active_provider === prov;
                    return (
                      <button
                        key={prov}
                        onClick={() => handleSwitchProvider(prov)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(16, 185, 129, 0.2)' : '#0f172a',
                          border: isSelected ? '1px solid #10b981' : '1px solid #334155',
                          color: isSelected ? '#10b981' : '#cbd5e1',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <div>{prov.toUpperCase()} FEED</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: 400 }}>
                          {prov === 'demo' && 'Deterministic offline 5-asset simulation'}
                          {prov === 'csv' && 'Custom uploaded historical prices'}
                          {prov === 'live' && 'Real-time proxy / external API'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {marketMsg && (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#064e3b', color: '#6ee7b7', fontSize: '12px' }}>
                    {marketMsg}
                  </div>
                )}
              </div>

              {/* Upload CSV Card */}
              <div
                style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '18px',
                  border: '1px solid #334155',
                }}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#f8fafc' }}>
                  Upload Custom Market Data CSV
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#94a3b8' }}>
                  Upload a CSV file containing date and asset price columns (e.g. Date, EQUITY, GOV_BONDS, GOLD).
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleUploadCSV}
                    disabled={marketUploading}
                    style={{ color: '#94a3b8', fontSize: '13px' }}
                  />
                  {marketUploading && <span style={{ fontSize: '12px', color: '#38bdf8' }}>Parsing and validating CSV...</span>}
                </div>
              </div>

              {/* Market History Preview */}
              {marketHistory && (
                <div
                  style={{
                    background: '#1e293b',
                    borderRadius: '12px',
                    padding: '18px',
                    border: '1px solid #334155',
                  }}
                >
                  <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#f8fafc' }}>
                    Current Volatilities (Annualized)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {Object.entries(marketHistory.volatilities || {}).map(([sym, vol]: [string, any]) => (
                      <div
                        key={sym}
                        style={{
                          background: '#0f172a',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #334155',
                        }}
                      >
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{sym}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                          {(vol * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'DOCUMENTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Document Upload Card */}
              <div
                style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '18px',
                  border: '1px solid #334155',
                }}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#f8fafc' }}>
                  Upload Fiduciary Document (PDF / DOCX / TXT / MD)
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#94a3b8' }}>
                  Upload investment policies, mandates, or regulatory guidelines. Chunks and embeddings are indexed locally for RAG grounding.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      padding: '8px 12px',
                      fontSize: '13px',
                    }}
                  >
                    <option value="COMPANY_POLICY">Company Policy (IPS)</option>
                    <option value="REGULATORY_MANDATE">Regulatory Mandate (SEBI/RBI)</option>
                    <option value="INTERNAL_GUIDELINE">Internal Risk Guideline</option>
                  </select>

                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleUploadDocument}
                    disabled={docUploading}
                    style={{ color: '#94a3b8', fontSize: '13px' }}
                  />

                  {docUploading && <span style={{ fontSize: '12px', color: '#38bdf8' }}>Extracting text and chunking...</span>}
                </div>

                {docMsg && (
                  <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '6px', background: '#0c4a6e', color: '#7dd3fc', fontSize: '12px' }}>
                    {docMsg}
                  </div>
                )}
              </div>

              {/* Indexed Documents Table */}
              <div
                style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '18px',
                  border: '1px solid #334155',
                }}
              >
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#f8fafc' }}>
                  Indexed Knowledge Documents ({documents.length})
                </h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '8px' }}>Filename</th>
                        <th style={{ padding: '8px' }}>Type</th>
                        <th style={{ padding: '8px' }}>Chunks</th>
                        <th style={{ padding: '8px' }}>Size</th>
                        <th style={{ padding: '8px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.document_id} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
                          <td style={{ padding: '8px', color: '#f8fafc', fontWeight: 500 }}>
                            📄 {d.filename}
                          </td>
                          <td style={{ padding: '8px', color: '#38bdf8' }}>{d.document_type}</td>
                          <td style={{ padding: '8px', color: '#10b981' }}>{d.chunk_count} chunks</td>
                          <td style={{ padding: '8px', color: '#94a3b8' }}>{d.file_size_kb} KB</td>
                          <td style={{ padding: '8px' }}>
                            <button
                              onClick={() => handleDeleteDocument(d.document_id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid #ef4444',
                                color: '#fca5a5',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Interactive RAG Search Tester */}
              <div
                style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '18px',
                  border: '1px solid #334155',
                }}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#f8fafc' }}>
                  Verify Semantic RAG Search
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94a3b8' }}>
                  Test vector cosine similarity query retrieval across indexed document chunks.
                </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchRAG()}
                    placeholder="e.g. cash floor equity limit correlation rebalance"
                    style={{
                      flex: 1,
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    onClick={handleSearchRAG}
                    disabled={ragSearching || !ragQuery.trim()}
                    style={{
                      background: '#38bdf8',
                      color: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Search RAG
                  </button>
                </div>

                {ragResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ragResults.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#0f172a',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          borderLeft: '3px solid #38bdf8',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                          <span><strong>{r.document}</strong> (§ {r.section}) {r.page ? `• Page ${r.page}` : ''}</span>
                          <span style={{ color: '#10b981' }}>Score: {r.relevance_score}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                          "{r.content}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
