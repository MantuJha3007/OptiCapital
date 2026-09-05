import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from './api';
import type { AEGISMasterState, CopilotAssessment } from './types';

interface FloatingCopilotProps {
  activeTab: string;
  masterState: AEGISMasterState | null;
}

interface CitationItem {
  document: string;
  section: string;
  page?: number;
  relevance_score?: number;
  content: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: CitationItem[];
  dataSources?: string[];
  intent?: string;
  engine?: string;
  timestamp: string;
}

type CopilotMode = 'minimized' | 'normal' | 'fullscreen';

const STORAGE_KEY_MESSAGES = 'aegis_copilot_messages_v2';
const STORAGE_KEY_POS_X = 'aegis_copilot_pos_x';
const STORAGE_KEY_POS_Y = 'aegis_copilot_pos_y';

export const FloatingCopilot: React.FC<FloatingCopilotProps> = ({ activeTab, masterState }) => {
  const [mode, setMode] = useState<CopilotMode>('minimized');
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'init-0',
        sender: 'assistant',
        text: `Hi, I'm **AEGIS Copilot**.\n\nI can help you understand your portfolio, risk, policy requirements, optimizer decisions, stress scenarios, forecasts, and audit evidence.\n\nWhat would you like to investigate?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingLabel, setLoadingLabel] = useState<string>('Analyzing...');

  // Draggable position state
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const savedX = sessionStorage.getItem(STORAGE_KEY_POS_X);
      const savedY = sessionStorage.getItem(STORAGE_KEY_POS_Y);
      if (savedX && savedY) {
        return { x: parseInt(savedX, 10), y: parseInt(savedY, 10) };
      }
    } catch {
      // ignore
    }
    return {
      x: typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 480) : 100,
      y: typeof window !== 'undefined' ? Math.max(20, window.innerHeight - 680) : 100,
    };
  });

  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Persist messages across tabs/refreshes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (mode !== 'minimized') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  // Drag event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === 'fullscreen') return;
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    document.body.style.userSelect = 'none';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (mode === 'fullscreen') return;
    const touch = e.touches[0];
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: touch.clientX - pos.x,
      y: touch.clientY - pos.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const modalWidth = 460;
    const modalHeight = 640;
    const newX = Math.min(Math.max(10, e.clientX - dragOffsetRef.current.x), window.innerWidth - modalWidth - 10);
    const newY = Math.min(Math.max(10, e.clientY - dragOffsetRef.current.y), window.innerHeight - modalHeight - 10);
    setPos({ x: newX, y: newY });
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingRef.current) return;
    const touch = e.touches[0];
    const modalWidth = 460;
    const modalHeight = 640;
    const newX = Math.min(Math.max(10, touch.clientX - dragOffsetRef.current.x), window.innerWidth - modalWidth - 10);
    const newY = Math.min(Math.max(10, touch.clientY - dragOffsetRef.current.y), window.innerHeight - modalHeight - 10);
    setPos({ x: newX, y: newY });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      try {
        sessionStorage.setItem(STORAGE_KEY_POS_X, String(pos.x));
        sessionStorage.setItem(STORAGE_KEY_POS_Y, String(pos.y));
      } catch {
        // ignore
      }
    }
  }, [pos]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  // Determine dynamic loading text
  const determineLoadingLabel = (q: string): string => {
    const l = q.toLowerCase();
    if (l.includes('policy') || l.includes('ips') || l.includes('rule') || l.includes('clause') || l.includes('churn')) {
      return 'Searching institutional policy repository & RAG...';
    }
    if (l.includes('rebalance') || l.includes('optimizer') || l.includes('intervention') || l.includes('trade')) {
      return 'Consulting CVXPY optimizer & fiduciary validator...';
    }
    if (l.includes('stress') || l.includes('break') || l.includes('fail') || l.includes('multiplier')) {
      return 'Computing reverse stress failure boundary...';
    }
    if (l.includes('capital') || l.includes('holding') || l.includes('position') || l.includes('cash')) {
      return 'Fetching live portfolio assets and capital data...';
    }
    return 'Consulting quantitative risk engine & fiduciary intelligence...';
  };

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoadingLabel(determineLoadingLabel(text));
    setLoading(true);

    // Build bounded conversation history for follow-up resolution
    const history = messages.slice(-6).map((m) => ({
      role: m.sender,
      content: m.text,
    }));

    // Rich screen context
    const screenCtx = {
      screen: activeTab.toUpperCase(),
      route: `/${activeTab.toLowerCase()}`,
      entity: 'portfolio',
      portfolio_id: masterState?.portfolio?.id || 'default',
      visible_metrics: {
        risk_score: masterState?.risk?.composite_score,
        operating_envelope: masterState?.risk?.operating_envelope,
        market_regime: masterState?.market?.regime,
        resilience_buffer: masterState?.resilience?.distance_to_failure_pct,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const res: CopilotAssessment = await api.chatCopilot(text, screenCtx, history);
      const assistantReply =
        res.custom_response || res.answer || res.response || res.summary || 'Assessment generated.';

      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: assistantReply,
        citations: res.policy_evidence,
        dataSources: (res as any).data_sources || [],
        intent: (res as any).intent,
        engine: (res as any).llm_meta?.engine || 'GROQ_FIDUCIARY_CORE',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `Error reaching AEGIS Copilot: ${err.message || 'Service unavailable'}. Fiduciary safety boundaries remain active.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetHistory = () => {
    const initMsg: Message = {
      id: 'init-reset',
      sender: 'assistant',
      text: `Hi, I'm **AEGIS Copilot**.\n\nI can help you understand your portfolio, risk, policy requirements, optimizer decisions, stress scenarios, forecasts, and audit evidence.\n\nWhat would you like to investigate?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initMsg]);
    try {
      sessionStorage.removeItem(STORAGE_KEY_MESSAGES);
    } catch {
      // ignore
    }
  };

  // Canonical starter questions
  const canonicalStarters = [
    { label: "What's happening with the portfolio?", query: "What's happening in the portfolio?" },
    { label: 'Why is this happening?', query: 'Why is this happening in the portfolio right now?' },
    { label: 'Why was this intervention recommended?', query: 'Why was this optimizer intervention recommended?' },
    { label: 'What could go wrong?', query: 'What could go wrong if we delay rebalancing?' },
    { label: 'What does the policy say?', query: 'What does our investment policy say about rebalancing and anti-churning?' },
    { label: 'What can you help me with?', query: 'What can you help me with?' },
  ];

  // Tab-specific contextual starters
  const getTabStarters = () => {
    const tab = activeTab.toUpperCase();
    if (tab.includes('CONTAGION')) {
      return [
        { label: 'Market Contagion Risk', query: 'What are the current market contagion and correlation risks?' },
        { label: 'Primary Contagion Vector', query: 'Which asset is the largest contagion vector in the current regime?' },
      ];
    }
    if (tab.includes('REVERSE') || tab.includes('STRESS')) {
      return [
        { label: 'What breaks us?', query: 'What breaks us? What is the critical failure boundary?' },
        { label: 'Distance to Failure', query: 'What is our current distance to the failure boundary?' },
      ];
    }
    if (tab.includes('OPTIMIZER') || tab.includes('REBALANCE')) {
      return [
        { label: 'Optimizer Rationale', query: 'Why did the optimizer propose this specific allocation?' },
        { label: 'Is rebalance permitted?', query: 'Is this rebalance permitted under the Anti-Churning clause?' },
      ];
    }
    if (tab.includes('AUDIT') || tab.includes('LEARNING')) {
      return [
        { label: 'Recent Interventions', query: 'What were our recent fiduciary interventions and their outcomes?' },
        { label: 'Audit Trail Verification', query: 'Have any unauthorized policy overrides occurred in the audit ledger?' },
      ];
    }
    return [
      { label: 'Total Capital & Value', query: 'What is our total capital and current portfolio value?' },
      { label: `Explain ${activeTab.replace('_', ' ')}`, query: `Explain what I am looking at on the ${activeTab.replace('_', ' ')} screen.` },
    ];
  };

  const riskEnvelope = masterState?.risk?.operating_envelope || 'GREEN';
  const riskColor = riskEnvelope === 'RED' ? '#ef4444' : riskEnvelope === 'YELLOW' ? '#eab308' : '#10b981';

  return (
    <>
      {/* 1. MINIMIZED TRIGGER BUTTON */}
      {mode === 'minimized' && (
        <button
          onClick={() => setMode('normal')}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#f8fafc',
            border: `1px solid ${riskColor}80`,
            boxShadow: `0 8px 30px ${riskColor}30, 0 4px 12px rgba(0,0,0,0.6)`,
            borderRadius: '9999px',
            padding: '12px 22px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1.0)';
          }}
          title="Open AEGIS Copilot"
        >
          <span style={{ fontSize: '18px' }}>🛡️</span>
          <span>AEGIS COPILOT</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              background: `${riskColor}22`,
              border: `1px solid ${riskColor}`,
              color: riskColor,
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            {riskEnvelope}
          </span>
        </button>
      )}

      {/* 2. FLOATING / FULLSCREEN DIALOG */}
      {mode !== 'minimized' && (
        <div
          style={
            mode === 'fullscreen'
              ? {
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  zIndex: 10000,
                  background: 'rgba(11, 17, 33, 0.98)',
                  backdropFilter: 'blur(24px)',
                  display: 'flex',
                  flexDirection: 'column',
                }
              : {
                  position: 'fixed',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: '460px',
                  maxWidth: 'calc(100vw - 24px)',
                  height: '640px',
                  maxHeight: 'calc(100vh - 24px)',
                  zIndex: 10000,
                  background: 'rgba(15, 23, 42, 0.96)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(51, 65, 85, 0.85)',
                  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }
          }
        >
          {/* Draggable Header */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{
              padding: '12px 18px',
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.8) 100%)',
              borderBottom: '1px solid rgba(51, 65, 85, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: mode === 'fullscreen' ? 'default' : 'grab',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🛡️</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                    AEGIS Risk Intelligence Copilot
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: `${riskColor}22`,
                      color: riskColor,
                      border: `1px solid ${riskColor}60`,
                      fontWeight: 700,
                    }}
                  >
                    {riskEnvelope}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'inline-block',
                    }}
                  />
                  <span>
                    Screen Context: <strong style={{ color: '#38bdf8' }}>{activeTab.replace('_', ' ')}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Reset dialog */}
              <button
                onClick={handleResetHistory}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                }}
                title="Reset Conversation"
              >
                🔄
              </button>

              {/* Fullscreen toggle */}
              <button
                onClick={() => setMode(mode === 'fullscreen' ? 'normal' : 'fullscreen')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                }}
                title={mode === 'fullscreen' ? 'Restore Window' : 'Maximize'}
              >
                {mode === 'fullscreen' ? '🗗' : '🗖'}
              </button>

              {/* Minimize / Close */}
              <button
                onClick={() => setMode('minimized')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                  padding: '4px 6px',
                  borderRadius: '4px',
                }}
                title="Minimize Copilot"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Prompts Carousel */}
          <div
            style={{
              padding: '8px 14px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {/* Tab specific starters first */}
            {getTabStarters().map((st, idx) => (
              <button
                key={`tab-${idx}`}
                onClick={() => handleSend(st.query)}
                disabled={loading}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  background: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                ★ {st.label}
              </button>
            ))}

            {/* General canonical starters */}
            {canonicalStarters.map((st, idx) => (
              <button
                key={`canon-${idx}`}
                onClick={() => handleSend(st.query)}
                disabled={loading}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  color: '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: mode === 'fullscreen' ? '65%' : '90%',
                  background:
                    m.sender === 'user'
                      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                      : 'rgba(30, 41, 59, 0.8)',
                  border:
                    m.sender === 'user'
                      ? '1px solid #3b82f6'
                      : '1px solid rgba(71, 85, 105, 0.55)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>

                {/* Verified Policy Citations */}
                {m.citations && m.citations.length > 0 && (
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#38bdf8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📜</span>
                      <span>Verified Policy Evidence ({m.citations.length})</span>
                    </div>
                    {m.citations.slice(0, 3).map((cit, cIdx) => (
                      <div
                        key={cIdx}
                        style={{
                          fontSize: '11px',
                          color: '#e2e8f0',
                          background: 'rgba(15, 23, 42, 0.65)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          marginBottom: '6px',
                          borderLeft: '3px solid #38bdf8',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#f8fafc' }}>{cit.document}</strong>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            § {cit.section}
                            {cit.relevance_score ? ` | ${(cit.relevance_score * 100).toFixed(0)}% match` : ''}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: '#94a3b8',
                            marginTop: '3px',
                            fontStyle: 'italic',
                            lineHeight: 1.4,
                          }}
                        >
                          "{cit.content.slice(0, 160)}..."
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Data Source Badges */}
                {m.dataSources && m.dataSources.length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                    }}
                  >
                    {m.dataSources.map((ds, dsIdx) => (
                      <span
                        key={dsIdx}
                        style={{
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#94a3b8',
                        }}
                      >
                        Source: {ds}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.45)',
                    marginTop: '6px',
                    textAlign: 'right',
                  }}
                >
                  {m.timestamp}
                </div>
              </div>
            ))}

            {/* Meaningful Contextual Loading State */}
            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                }}
              >
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #38bdf8',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>{loadingLabel}</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Footer Input */}
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(30, 41, 59, 0.8)',
              borderTop: '1px solid rgba(51, 65, 85, 0.6)',
              display: 'flex',
              gap: '10px',
            }}
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Ask Copilot about risk, policy, capital, or ${activeTab.replace('_', ' ')}...`}
              disabled={loading}
              style={{
                flex: 1,
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(71, 85, 105, 0.7)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputQuery.trim()}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 18px',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                opacity: loading || !inputQuery.trim() ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};
