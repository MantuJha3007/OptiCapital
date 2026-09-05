import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Activity, Flame, HelpCircle, Layers } from 'lucide-react';
import type { Portfolio, RiskMetrics } from '../types';

interface ContagionNetworkProps {
  portfolio: Portfolio | null;
  riskMetrics: RiskMetrics | null;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  symbol: string;
  category: string;
  weight: number;
  riskContribution: number;
  marketValue: number;
  volatility: number;
  color: string;
  radius: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  correlation: number;
}

const ASSET_COLORS: Record<string, string> = {
  EQUITY: '#6366f1',
  GOV_BONDS: '#06b6d4',
  CORP_BONDS: '#8b5cf6',
  GOLD: '#f59e0b',
  CASH: '#10b981',
};

// Default baseline correlation matrix if backend hasn't generated rolling history
const DEFAULT_CORRELATIONS: Record<string, Record<string, number>> = {
  EQUITY: { EQUITY: 1.0, GOV_BONDS: -0.15, CORP_BONDS: 0.35, GOLD: 0.05, CASH: 0.0 },
  GOV_BONDS: { EQUITY: -0.15, GOV_BONDS: 1.0, CORP_BONDS: 0.55, GOLD: 0.20, CASH: 0.0 },
  CORP_BONDS: { EQUITY: 0.35, GOV_BONDS: 0.55, CORP_BONDS: 1.0, GOLD: 0.12, CASH: 0.0 },
  GOLD: { EQUITY: 0.05, GOV_BONDS: 0.20, CORP_BONDS: 0.12, GOLD: 1.0, CASH: 0.0 },
  CASH: { EQUITY: 0.0, GOV_BONDS: 0.0, CORP_BONDS: 0.0, GOLD: 0.0, CASH: 1.0 },
};

export function ContagionNetwork({ portfolio, riskMetrics }: ContagionNetworkProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [stressUplift, setStressUplift] = useState<number>(0); // 0 (normal) to 1.0 (extreme crisis)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string>('EQUITY');

  // Asset symbols in portfolio
  const symbols = useMemo(() => {
    if (!portfolio || !portfolio.holdings) return ['EQUITY', 'GOV_BONDS', 'CORP_BONDS', 'GOLD', 'CASH'];
    return portfolio.holdings.map((h) => h.asset?.symbol || 'UNKNOWN');
  }, [portfolio]);

  // Combined correlation matrix factoring in stress uplift
  const currentCorrMatrix = useMemo(() => {
    const base = riskMetrics?.correlation_matrix || DEFAULT_CORRELATIONS;
    const result: Record<string, Record<string, number>> = {};

    symbols.forEach((s1) => {
      result[s1] = {};
      symbols.forEach((s2) => {
        if (s1 === s2) {
          result[s1][s2] = 1.0;
        } else {
          const raw = base[s1]?.[s2] ?? 0.0;
          // During stress, correlations among non-cash assets surge toward 0.85
          if (s1 === 'CASH' || s2 === 'CASH') {
            result[s1][s2] = raw;
          } else {
            const stressed = raw + stressUplift * (0.85 - raw);
            result[s1][s2] = Math.max(-1.0, Math.min(1.0, stressed));
          }
        }
      });
    });

    return result;
  }, [symbols, riskMetrics?.correlation_matrix, stressUplift]);

  // D3 force simulation setup
  useEffect(() => {
    if (!svgRef.current || !portfolio) return;

    const width = svgRef.current.clientWidth || 650;
    const height = 420;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Container group with zoom support
    const g = svg.append('g').attr('class', 'network-container');

    // Build nodes data
    const nodes: GraphNode[] = portfolio.holdings.map((h) => {
      const sym = h.asset?.symbol || 'UNKNOWN';
      const rc = riskMetrics?.risk_contributions?.[sym] ?? h.weight;
      // Radius between 20px and 45px based on risk contribution
      const r = 22 + Math.max(0, Math.min(rc, 1.0)) * 26;

      return {
        id: sym,
        symbol: sym,
        name: h.asset?.name || sym,
        category: h.asset?.category || 'ASSET',
        weight: h.weight,
        riskContribution: rc,
        marketValue: Number(h.market_value),
        volatility: h.asset?.volatility || 0.15,
        color: ASSET_COLORS[sym] || '#6366f1',
        radius: r,
      };
    });

    // Build links data: pair of assets with correlation
    const links: GraphLink[] = [];
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const s1 = symbols[i];
        const s2 = symbols[j];
        const corr = currentCorrMatrix[s1]?.[s2] ?? 0.0;

        // Render link if correlation is significant
        if (Math.abs(corr) > 0.05) {
          links.push({
            source: s1,
            target: s2,
            correlation: corr,
          });
        }
      }
    }

    // Force simulation
    // High stress pulls nodes closer together (shorter link distance, stronger attraction)
    const linkDistance = 160 - stressUplift * 80;
    const chargeStrength = -350 + stressUplift * 150;

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            // High positive correlation pulls closer; negative pushes farther
            const factor = 1 - d.correlation * 0.45;
            return Math.max(50, linkDistance * factor);
          })
          .strength(0.6 + stressUplift * 0.3)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius((d) => d.radius + 18));

    // Draw links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', (d) => Math.max(1.5, Math.abs(d.correlation) * 5))
      .attr('stroke', (d) => {
        if (d.correlation < -0.05) return '#10b981'; // Green: Diversifier/hedge
        if (d.correlation > 0.6) return '#ef4444';  // Red: Strong contagion risk
        if (d.correlation > 0.25) return '#f59e0b'; // Amber: Moderate correlation
        return 'rgba(255, 255, 255, 0.15)';        // Neutral
      })
      .attr('stroke-opacity', (d) => Math.min(0.9, 0.25 + Math.abs(d.correlation) * 0.7))
      .attr('stroke-dasharray', (d) => (d.correlation < 0 ? '4 3' : 'none'));

    // Link labels showing correlation value
    const linkLabels = g
      .append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('font-size', '10px')
      .attr('fill', (d) => (d.correlation < 0 ? '#10b981' : d.correlation > 0.5 ? '#ef4444' : '#94a3b8'))
      .attr('text-anchor', 'middle')
      .text((d) => (d.correlation >= 0 ? `+${d.correlation.toFixed(2)}` : d.correlation.toFixed(2)));

    // Drag behavior for nodes
    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // Draw node groups
    const nodeGroup = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(drag as any)
      .on('mouseenter', (_, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (_, d) => setSelectedAsset(d.symbol));

    // Outer glow aura
    nodeGroup
      .append('circle')
      .attr('r', (d) => d.radius + 6)
      .attr('fill', (d) => d.color)
      .attr('opacity', 0.18)
      .attr('class', 'node-pulse');

    // Main circle
    nodeGroup
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', (d) => (d.symbol === selectedAsset ? 3 : 1.5))
      .attr('stroke-opacity', 0.8)
      .style('cursor', 'pointer');

    // Symbol label inside node
    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-2px')
      .attr('fill', '#ffffff')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .style('pointer-events', 'none')
      .text((d) => d.symbol);

    // Weight/Risk contribution label
    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '14px')
      .attr('fill', 'rgba(255, 255, 255, 0.85)')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')
      .text((d) => `${(d.riskContribution * 100).toFixed(0)}% RC`);

    // Simulation tick update
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 4);

      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [portfolio, currentCorrMatrix, stressUplift, selectedAsset]);

  // Compute HHI Comparison
  const hhiCapital = useMemo(() => {
    if (!portfolio?.holdings) return 0.25;
    return portfolio.holdings.reduce((acc, h) => acc + h.weight ** 2, 0);
  }, [portfolio]);

  const hhiRisk = riskMetrics?.hhi_risk ?? hhiCapital;

  return (
    <div className="contagion-page">
      {/* Header Banner */}
      <div className="tab-banner">
        <div className="tab-banner-content">
          <div className="tab-title-row">
            <Activity className="tab-icon text-indigo-400" size={24} />
            <h2>Risk & Systemic Contagion Lab</h2>
            <span className="live-tag">
              <span className="pulse-dot"></span> LIVE TOPOLOGY
            </span>
          </div>
          <p className="tab-description">
            Force-directed correlation network mapping cross-asset contagion channels. Node area reflects marginal
            Risk Contribution (RC), exposing structural portfolio concentration that market-cap weighting conceals.
          </p>
        </div>

        {/* Stress Contagion Slider */}
        <div className="stress-slider-card">
          <div className="slider-header">
            <div className="slider-label">
              <Flame size={16} className={stressUplift > 0.5 ? 'text-rose-500 animate-pulse' : 'text-amber-400'} />
              <span>Stress Contagion Mode:</span>
              <strong>{stressUplift === 0 ? 'Calm / Baseline' : `${(stressUplift * 100).toFixed(0)}% Contagion Shock`}</strong>
            </div>
            {stressUplift > 0 && (
              <button className="reset-slider-btn" onClick={() => setStressUplift(0)}>
                Reset
              </button>
            )}
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={stressUplift}
            onChange={(e) => setStressUplift(parseFloat(e.target.value))}
            className="contagion-slider"
          />
          <div className="slider-ticks">
            <span>0% (Calm)</span>
            <span>50% (Elevated Vol)</span>
            <span>100% (Full Liquidity Freeze)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: D3 Network Visualizer & Inspector */}
      <div className="contagion-grid">
        {/* Left Column: D3 Graph */}
        <div className="card network-card">
          <div className="card-header-flex">
            <div>
              <h3>Contagion Network Topology</h3>
              <span className="card-subtitle">
                Green dashed links = Diversification buffer (negative correlation). Red thick links = Contagion channels.
              </span>
            </div>
            <div className="network-legend">
              <span className="legend-chip hedge">● Hedge (ρ &lt; 0)</span>
              <span className="legend-chip moderate">● Moderate (0.2 &lt; ρ &lt; 0.5)</span>
              <span className="legend-chip danger">● Contagion (ρ &gt; 0.6)</span>
            </div>
          </div>

          <div className="network-stage">
            <svg ref={svgRef} className="network-svg" width="100%" height="420" />

            {/* Hover Tooltip Overlay */}
            {hoveredNode && (
              <div
                className="network-tooltip"
                style={{
                  left: (hoveredNode.x || 300) + 20,
                  top: (hoveredNode.y || 150) - 20,
                }}
              >
                <div className="tooltip-title" style={{ color: hoveredNode.color }}>
                  {hoveredNode.name} ({hoveredNode.symbol})
                </div>
                <div className="tooltip-row">
                  <span>Capital Weight:</span>
                  <strong>{(hoveredNode.weight * 100).toFixed(1)}%</strong>
                </div>
                <div className="tooltip-row">
                  <span>Risk Contribution:</span>
                  <strong className={hoveredNode.riskContribution > hoveredNode.weight * 1.3 ? 'text-amber-400' : ''}>
                    {(hoveredNode.riskContribution * 100).toFixed(1)}%
                  </strong>
                </div>
                <div className="tooltip-row">
                  <span>Annualized Volatility:</span>
                  <strong>{(hoveredNode.volatility * 100).toFixed(1)}%</strong>
                </div>
                <div className="tooltip-row">
                  <span>Capital Value:</span>
                  <strong>₹{hoveredNode.marketValue.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Concentration & Correlation Heatmap */}
        <div className="contagion-side-column">
          {/* HHI Concentration Card */}
          <div className="card concentration-card">
            <div className="card-header-flex">
              <div className="flex-center gap-2">
                <Layers size={18} className="text-indigo-400" />
                <h4>Concentration Metric (HHI)</h4>
              </div>
              <span className="badge-pill">
                {hhiRisk > 0.35 ? 'HIGH CONCENTRATION' : hhiRisk > 0.25 ? 'MODERATE' : 'WELL BALANCED'}
              </span>
            </div>

            <div className="hhi-comparison">
              <div className="hhi-metric-box">
                <span className="hhi-label">Capital HHI</span>
                <span className="hhi-val">{hhiCapital.toFixed(3)}</span>
                <span className="hhi-sub">Weight Dispersion</span>
              </div>
              <div className="hhi-arrow">→</div>
              <div className="hhi-metric-box highlight">
                <span className="hhi-label">Risk HHI</span>
                <span className="hhi-val" style={{ color: hhiRisk > 0.3 ? '#f59e0b' : '#10b981' }}>
                  {hhiRisk.toFixed(3)}
                </span>
                <span className="hhi-sub">Variance Dispersion</span>
              </div>
            </div>

            <div className="hhi-explanation">
              <HelpCircle size={14} className="text-slate-400 inline mr-1" />
              <span>
                {hhiRisk > hhiCapital * 1.25 ? (
                  <strong className="text-amber-400">
                    Warning: Risk is {(hhiRisk / hhiCapital).toFixed(1)}x more concentrated than capital weights suggest.
                    High volatility assets account for the majority of portfolio volatility.
                  </strong>
                ) : (
                  <span>Portfolio risk contributions are evenly distributed across asset classes.</span>
                )}
              </span>
            </div>
          </div>

          {/* 5x5 Pairwise Correlation Heatmap */}
          <div className="card heatmap-card">
            <h4>Pairwise Correlation Matrix</h4>
            <div className="heatmap-table-wrapper">
              <table className="heatmap-table">
                <thead>
                  <tr>
                    <th></th>
                    {symbols.map((s) => (
                      <th key={s} title={s}>
                        {s.substring(0, 4)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((s1) => (
                    <tr key={s1}>
                      <td className="row-header" title={s1}>
                        {s1.substring(0, 4)}
                      </td>
                      {symbols.map((s2) => {
                        const val = currentCorrMatrix[s1]?.[s2] ?? 0;
                        const isDiag = s1 === s2;
                        // Color styling based on correlation
                        let bg = 'rgba(255,255,255,0.03)';
                        let textColor = '#94a3b8';

                        if (!isDiag) {
                          if (val < -0.1) {
                            bg = `rgba(16, 185, 129, ${Math.min(0.7, Math.abs(val) * 0.8)})`;
                            textColor = '#ecfdf5';
                          } else if (val > 0.5) {
                            bg = `rgba(239, 68, 68, ${Math.min(0.8, val * 0.85)})`;
                            textColor = '#fef2f2';
                          } else if (val > 0.2) {
                            bg = `rgba(245, 158, 11, ${Math.min(0.6, val * 0.7)})`;
                            textColor = '#fffbeb';
                          }
                        }

                        return (
                          <td
                            key={s2}
                            style={{ backgroundColor: bg, color: textColor }}
                            title={`${s1} ↔ ${s2}: ${val.toFixed(3)}`}
                          >
                            {isDiag ? '1.00' : val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
