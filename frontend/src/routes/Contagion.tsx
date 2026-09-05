/* Correlation & Contagion.

   The question this view exists to answer: an allocation chart says the book
   is spread across five asset classes, so why is it still fragile? Because
   diversification is a statement about behaviour, not about labels. The
   network shows which positions actually move together, and the cluster
   readout converts that into the number that matters — the combined weight
   of everything that would fall at once. */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Waves } from "lucide-react";
import { useReadySystem } from "../store/system";
import { Metric, Panel, Meter, Rule, Swatch, Empty } from "../components/ui/primitives";
import { ContagionGraph } from "../components/viz/ContagionGraph";
import {
  CLASS_META,
  CLASS_ORDER,
  CLUSTER_THRESHOLD,
  EDGE_THRESHOLD,
  clusterName,
} from "../lib/exposure";
import { pct, inr } from "../lib/format";

export default function Contagion() {
  const { data, exposure } = useReadySystem();
  const [threshold, setThreshold] = useState(EDGE_THRESHOLD);
  const [selected, setSelected] = useState<string | null>(null);

  const visible = useMemo(
    () => exposure.edges.filter((e) => Math.abs(e.rho) >= threshold),
    [exposure.edges, threshold],
  );

  const hidden = useMemo(
    () => exposure.edges.filter((e) => e.hidden).sort((a, b) => b.rho - a.rho),
    [exposure.edges],
  );

  const node = selected ? exposure.byId.get(selected) : null;

  const connections = useMemo(() => {
    if (!selected) return [];
    return exposure.edges
      .filter((e) => e.source === selected || e.target === selected)
      .map((e) => ({
        other: exposure.byId.get(e.source === selected ? e.target : e.source)!,
        rho: e.rho,
        hidden: e.hidden,
      }))
      .sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
  }, [selected, exposure]);

  const largest = exposure.clusters[0] ?? null;
  const clusteredWeight = exposure.clusters.reduce((a, c) => a + c.weight, 0);

  return (
    <div className="flex flex-col gap-4 rise">
      {/* ── Framing ───────────────────────────────────────────────────── */}
      <section className="panel p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Metric
            label="Reported HHI"
            value={data.risk.metrics.concentration.toFixed(3)}
            tone="muted"
            sub="What position counting sees"
          />
          <Metric
            label="Capital inside a cluster"
            value={pct(clusteredWeight)}
            tone={clusteredWeight > 0.5 ? "regime" : "default"}
            sub={`Moving as ${exposure.clusters.length} bodies, not ${exposure.sleeves.length}`}
          />
          <Metric
            label="Largest single block"
            value={largest ? pct(largest.weight) : "—"}
            sub={largest ? clusterName(largest, exposure.byId) : "No cluster detected"}
          />
          <Metric
            label="Hidden channels"
            value={String(hidden.length)}
            tone={hidden.length ? "regime" : "default"}
            sub="Pairs above what their classes imply"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-4">
        {/* ── Network ─────────────────────────────────────────────────── */}
        <Panel
          title="Correlation network"
          hint="Drag to rearrange · scroll to zoom · click to inspect"
          bodyClass="p-0"
        >
          <div className="px-4 py-3 border-b hair flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2.5 min-w-0">
              <span className="label whitespace-nowrap">Min |ρ|</span>
              <input
                type="range"
                min={0.3}
                max={0.9}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-28 cursor-pointer"
                aria-label="Minimum absolute correlation to draw an edge"
              />
              <span className="num text-[11.5px] w-8">{threshold.toFixed(2)}</span>
            </label>

            <span className="text-[11px] text-fg-3">
              <span className="num text-fg-2">{visible.length}</span> of{" "}
              <span className="num">{exposure.edges.length}</span> links shown
            </span>

            <div className="flex items-center gap-3.5 ml-auto flex-wrap">
              {CLASS_ORDER.filter((c) => exposure.sleeves.some((s) => s.cls === c)).map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 text-[10.5px] text-fg-3">
                  <Swatch color={CLASS_META[c].color} />
                  {CLASS_META[c].short}
                </span>
              ))}
            </div>
          </div>

          <ContagionGraph
            exposure={exposure}
            threshold={threshold}
            selected={selected}
            onSelect={setSelected}
            height={540}
          />

          <div className="px-4 py-3 border-t hair grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2.5">
            <LegendItem swatch={<span className="w-5 h-[3px] rounded-full" style={{ background: "var(--regime)" }} />}>
              Hidden channel
            </LegendItem>
            <LegendItem swatch={<span className="w-5 h-[3px] rounded-full bg-[var(--color-fg-3)]" />}>
              Positive ρ
            </LegendItem>
            <LegendItem
              swatch={
                <span
                  className="w-5 h-0 border-t-2 border-dashed"
                  style={{ borderColor: "var(--color-ac-gov)" }}
                />
              }
            >
              Negative ρ (hedge)
            </LegendItem>
            <LegendItem
              swatch={
                <span
                  className="w-3.5 h-3.5 rounded-full border-2"
                  style={{ borderColor: "var(--color-crisis)", opacity: 0.6 }}
                />
              }
            >
              Risk above capital
            </LegendItem>
          </div>
        </Panel>

        {/* ── Rail ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {node ? (
            <Panel
              title={node.name}
              hint={CLASS_META[node.cls].label}
              actions={
                <button className="btn btn-quiet text-[11px]" onClick={() => setSelected(null)}>
                  Clear
                </button>
              }
            >
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Metric label="Capital" value={pct(node.weight)} size="sm" sub={inr(node.value)} />
                <Metric label="Risk" value={pct(node.riskShare)} size="sm" />
                <Metric
                  label="Intensity"
                  value={`${node.intensity.toFixed(2)}x`}
                  size="sm"
                  tone={node.intensity > 1.15 ? "regime" : "default"}
                />
              </div>

              <Rule>Connected exposure</Rule>
              <ul className="flex flex-col gap-2 mt-2.5 max-h-[280px] overflow-y-auto pr-1">
                {connections.map((c) => (
                  <li key={c.other.id} className="flex items-center gap-2.5">
                    <Swatch color={CLASS_META[c.other.cls].color} />
                    <span className="text-[11.5px] text-fg-2 flex-1 truncate">{c.other.name}</span>
                    <span className="w-16 shrink-0">
                      <Meter
                        value={Math.abs(c.rho)}
                        of={1}
                        height={4}
                        color={
                          c.hidden
                            ? "var(--regime)"
                            : c.rho < 0
                              ? "var(--color-ac-gov)"
                              : "var(--color-fg-3)"
                        }
                      />
                    </span>
                    <span
                      className="num text-[11px] w-11 text-right shrink-0"
                      style={{ color: c.hidden ? "var(--regime)" : "var(--color-fg-3)" }}
                    >
                      {c.rho.toFixed(2)}
                    </span>
                  </li>
                ))}
                {connections.length === 0 && (
                  <li className="text-[11.5px] text-fg-3">
                    No correlations above {EDGE_THRESHOLD.toFixed(2)}. This sleeve is a genuine
                    diversifier.
                  </li>
                )}
              </ul>

              {connections.some((c) => c.hidden) && (
                <p
                  className="mt-3.5 pt-3 border-t hair text-[11.5px] leading-relaxed"
                  style={{ color: "var(--color-fg-2)" }}
                >
                  {connections.find((c) => c.hidden)!.hidden}
                </p>
              )}
            </Panel>
          ) : (
            <Panel title="Detected clusters" hint={`Linked at ρ ≥ ${CLUSTER_THRESHOLD.toFixed(2)}`}>
              {exposure.clusters.length === 0 ? (
                <Empty
                  title="No clusters detected"
                  body="No group of sleeves is correlated tightly enough to be treated as a single risk body."
                />
              ) : (
                <ul className="flex flex-col gap-4">
                  {exposure.clusters.map((c) => (
                    <li key={c.id}>
                      <div className="flex items-baseline justify-between gap-3 mb-1.5">
                        <span className="text-[12.5px] font-medium truncate">
                          {clusterName(c, exposure.byId)}
                        </span>
                        <span
                          className="num text-[12px] font-semibold shrink-0"
                          style={{ color: c.crossClass ? "var(--regime)" : "var(--color-fg-2)" }}
                        >
                          {pct(c.weight)}
                        </span>
                      </div>
                      <Meter
                        value={c.weight}
                        of={1}
                        height={5}
                        color={c.crossClass ? "var(--regime)" : "var(--color-fg-3)"}
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.members.map((id) => {
                          const s = exposure.byId.get(id)!;
                          return (
                            <button
                              key={id}
                              onClick={() => setSelected(id)}
                              className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10.5px] text-fg-2 border hair hover:text-fg transition-colors"
                            >
                              <Swatch color={CLASS_META[s.cls].color} size={6} />
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[10.5px] text-fg-3">
                        avg ρ <span className="num">{c.avgRho.toFixed(2)}</span> ·{" "}
                        {pct(c.riskShare)} of portfolio risk
                        {c.crossClass && " · spans asset classes"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 pt-3.5 border-t hair text-[11px] text-fg-3 leading-relaxed">
                Select any node in the network to inspect its connections instead.
              </p>
            </Panel>
          )}
        </div>
      </div>

      {/* ── Hidden channels ───────────────────────────────────────────── */}
      <Panel
        title="Hidden contagion channels"
        hint="Pairs more correlated than their asset classes imply"
        bodyClass="p-0"
      >
        {hidden.length === 0 ? (
          <Empty
            title="No hidden channels"
            body="Every correlation in the book is explained by the asset classes involved."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="grid min-w-[640px]">
              <thead>
                <tr>
                  <th>Exposure pair</th>
                  <th className="tnum">ρ</th>
                  <th className="tnum">Combined capital</th>
                  <th>Why they move together</th>
                </tr>
              </thead>
              <tbody>
                {hidden.map((e) => {
                  const a = exposure.byId.get(e.source)!;
                  const b = exposure.byId.get(e.target)!;
                  return (
                    <tr key={`${e.source}-${e.target}`}>
                      <td>
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Swatch color={CLASS_META[a.cls].color} />
                            <span className="text-[12px]">{a.name}</span>
                          </span>
                          <Waves size={12} className="text-fg-3 shrink-0" />
                          <span className="inline-flex items-center gap-1.5">
                            <Swatch color={CLASS_META[b.cls].color} />
                            <span className="text-[12px]">{b.name}</span>
                          </span>
                        </span>
                      </td>
                      <td
                        className="num tnum font-semibold"
                        style={{ color: "var(--regime)" }}
                      >
                        {e.rho.toFixed(2)}
                      </td>
                      <td className="num tnum text-fg-2">{pct(a.weight + b.weight)}</td>
                      <td className="text-[11.5px] text-fg-3">{e.hidden}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t hair">
          <p className="text-[11px] text-fg-3 leading-relaxed max-w-[92ch]">
            Each of these pairs sits in a different row of the allocation chart and therefore
            reads as diversification. Under stress they behave as one position. This is the
            exposure that{" "}
            <Link to="/stress" className="text-[var(--regime)] hover:underline">
              scenario testing
            </Link>{" "}
            converts into a loss number.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function LegendItem({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10.5px] text-fg-3">
      <span className="flex items-center justify-center w-5 shrink-0">{swatch}</span>
      {children}
    </span>
  );
}
