/* Risk Attribution — where the risk comes from.

   The score view on the Overview says how much risk there is. This view
   answers the harder question: which positions are producing it. Every
   number here is an Euler risk contribution computed from the covariance
   implied by sleeve volatilities and the correlation model, so the
   "capital is not risk" claim is arithmetic rather than assertion. */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useReadySystem } from "../store/system";
import { Metric, Panel, Meter, Rule, Swatch } from "../components/ui/primitives";
import { Attribution } from "../components/viz/Attribution";
import { CLASS_META, CLASS_ORDER, type AssetClass, type Sleeve } from "../lib/exposure";
import { decomposeScore } from "../lib/regime";
import { inr, pct } from "../lib/format";

type SortKey = "riskShare" | "weight" | "intensity" | "vol" | "liquidity";

const COLUMNS: Array<{ key: SortKey; label: string; help: string }> = [
  { key: "weight", label: "Capital", help: "Share of portfolio value" },
  { key: "riskShare", label: "Risk", help: "Share of portfolio volatility" },
  { key: "intensity", label: "Intensity", help: "Risk share ÷ capital share" },
  { key: "vol", label: "Volatility", help: "Standalone annualised volatility" },
  { key: "liquidity", label: "Liquidity", help: "1.00 is immediately realisable" },
];

export default function RiskView() {
  const { data, exposure } = useReadySystem();
  const m = data.risk.metrics;
  const [sort, setSort] = useState<SortKey>("riskShare");
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = useMemo(
    () => [...exposure.sleeves].sort((a, b) => b[sort] - a[sort]),
    [exposure.sleeves, sort],
  );

  // Roll sleeves back up to the asset classes the backend actually holds.
  const byClass = useMemo(() => {
    return CLASS_ORDER.map((cls) => {
      const members = exposure.sleeves.filter((s) => s.cls === cls);
      if (!members.length) return null;
      const weight = members.reduce((a, s) => a + s.weight, 0);
      const riskShare = members.reduce((a, s) => a + s.riskShare, 0);
      return { cls, weight, riskShare, intensity: weight > 0 ? riskShare / weight : 0, members };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [exposure.sleeves]);

  const misaligned = [...exposure.sleeves]
    .filter((s) => s.intensity > 1.15)
    .sort((a, b) => b.riskShare - a.riskShare);

  const illiquid = [...exposure.sleeves]
    .filter((s) => s.liquidity < 0.8)
    .sort((a, b) => a.liquidity - b.liquidity);

  const topComponent = decomposeScore(m).sort((a, b) => b.points - a.points)[0];

  return (
    <div className="flex flex-col gap-4 rise">
      {/* ── Framing figures ───────────────────────────────────────────── */}
      <section className="panel p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Metric
            label="Portfolio volatility"
            value={pct(m.volatility)}
            sub="Reported by the risk engine"
          />
          <Metric
            label="Model volatility"
            value={pct(exposure.modelVol)}
            tone="muted"
            sub="Implied by sleeve covariance"
          />
          <Metric
            label="Concentrated sleeves"
            value={String(misaligned.length)}
            tone={misaligned.length ? "regime" : "default"}
            sub="Carrying risk above their capital share"
          />
          <Metric
            label="Largest score driver"
            value={topComponent.label}
            sub={`${topComponent.points.toFixed(1)} of ${m.risk_score.toFixed(1)} points`}
          />
        </div>
      </section>

      {/* ── The core insight ──────────────────────────────────────────── */}
      <Panel
        title="Capital against risk contribution"
        hint="Same baseline, opposite directions — asymmetry is the signal"
      >
        <Attribution sleeves={exposure.sleeves} hovered={hovered} onHover={setHovered} />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-4">
        {/* ── Class roll-up ───────────────────────────────────────────── */}
        <Panel title="By asset class" hint="Sleeves rolled back to backend positions">
          <div className="flex flex-col gap-4">
            {byClass.map((c) => (
              <div key={c.cls}>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Swatch color={CLASS_META[c.cls].color} />
                    <span className="text-[12.5px] font-medium truncate">
                      {CLASS_META[c.cls].label}
                    </span>
                    <span className="text-[10.5px] text-fg-3 shrink-0">
                      {c.members.length} sleeves
                    </span>
                  </span>
                  <span
                    className="num text-[12px] font-semibold shrink-0"
                    style={{
                      color: c.intensity > 1.15 ? "var(--color-crisis)" : "var(--color-fg-2)",
                    }}
                  >
                    {c.intensity.toFixed(2)}x
                  </span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className="num text-[10px] text-fg-3 w-11 shrink-0">{pct(c.weight)}</span>
                  <div className="flex-1">
                    <Meter
                      value={c.weight}
                      of={1}
                      height={5}
                      color={CLASS_META[c.cls].color}
                      title="Capital share"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5 items-center mt-1">
                  <span className="num text-[10px] text-fg-3 w-11 shrink-0">
                    {pct(c.riskShare)}
                  </span>
                  <div className="flex-1">
                    <Meter
                      value={c.riskShare}
                      of={1}
                      height={5}
                      color={
                        c.intensity > 1.15 ? "var(--color-crisis)" : CLASS_META[c.cls].color
                      }
                      title="Risk share"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-fg-3 leading-relaxed">
            Upper bar is capital, lower bar is risk. Where the lower bar is longer, the class is
            consuming more risk budget than its allocation suggests.
          </p>
        </Panel>

        {/* ── Vulnerabilities ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Panel title="What requires attention" hint="Ranked by risk carried">
            {misaligned.length === 0 ? (
              <p className="text-[11.5px] text-fg-3 leading-relaxed">
                No sleeve carries materially more risk than capital. Risk is proportionate to
                allocation across the book.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {misaligned.slice(0, 4).map((s) => (
                  <li key={s.id} className="flex items-start gap-3">
                    <Swatch color={CLASS_META[s.cls].color} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12.5px] font-medium truncate">{s.name}</span>
                        <span
                          className="num text-[11.5px] font-semibold shrink-0"
                          style={{ color: "var(--color-crisis)" }}
                        >
                          {s.intensity.toFixed(2)}x
                        </span>
                      </div>
                      <p className="text-[11px] text-fg-3 mt-0.5 leading-relaxed">
                        {pct(s.riskShare)} of portfolio risk on {pct(s.weight)} of capital
                        {" · "}
                        <span className="num">{pct(s.vol)}</span> standalone volatility
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Liquidity exposure" hint="Sleeves below 0.80 realisability">
            {illiquid.length === 0 ? (
              <p className="text-[11.5px] text-fg-3 leading-relaxed">
                Every sleeve is highly realisable. Liquidity is not currently a constraint on
                intervention.
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-2.5">
                  {illiquid.map((s) => (
                    <li key={s.id} className="flex items-center gap-3">
                      <span className="text-[12px] text-fg-2 flex-1 truncate">{s.name}</span>
                      <span className="w-24 shrink-0">
                        <Meter
                          value={s.liquidity}
                          of={1}
                          height={5}
                          color={s.liquidity < 0.7 ? "var(--color-warning)" : "var(--color-fg-3)"}
                        />
                      </span>
                      <span className="num text-[11px] text-fg-3 w-9 text-right shrink-0">
                        {s.liquidity.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3.5 text-[11px] text-fg-3 leading-relaxed">
                  Low realisability raises the true cost of a forced reduction — the optimiser
                  should prefer to trade elsewhere first.
                </p>
              </>
            )}
          </Panel>
        </div>
      </div>

      {/* ── Full detail ───────────────────────────────────────────────── */}
      <Panel
        title="Position detail"
        hint="Click a column to sort"
        bodyClass="p-0"
      >
        <div className="overflow-x-auto">
          <table className="grid min-w-[720px]">
            <thead>
              <tr>
                <th>Sleeve</th>
                <th>Class</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="tnum">
                    <button
                      className="inline-flex items-center gap-1 hover:text-fg transition-colors uppercase tracking-[0.09em]"
                      onClick={() => setSort(c.key)}
                      title={c.help}
                      style={sort === c.key ? { color: "var(--regime)" } : undefined}
                    >
                      {c.label}
                      {sort === c.key && <span aria-hidden>↓</span>}
                    </button>
                  </th>
                ))}
                <th className="tnum">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <Row key={s.id} sleeve={s} highlight={hovered === s.id} onHover={setHovered} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t hair">
          <Rule>Note</Rule>
          <p className="mt-2 text-[11px] text-fg-3 leading-relaxed max-w-[86ch]">
            Risk contributions are an Euler decomposition of portfolio volatility: each sleeve is
            charged <span className="num">wᵢ·(Σw)ᵢ/σₚ</span>, so contributions sum exactly to total
            risk. Correlated sleeves therefore carry each other&rsquo;s weight — see the{" "}
            <Link to="/contagion" className="text-[var(--regime)] hover:underline">
              contagion network
            </Link>{" "}
            for which ones.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function Row({
  sleeve: s,
  highlight,
  onHover,
}: {
  sleeve: Sleeve;
  highlight: boolean;
  onHover: (id: string | null) => void;
}) {
  const hot = s.intensity > 1.15;
  return (
    <tr
      onMouseEnter={() => onHover(s.id)}
      onMouseLeave={() => onHover(null)}
      style={highlight ? { background: "rgba(255,255,255,0.03)" } : undefined}
    >
      <td className="font-medium">{s.name}</td>
      <td>
        <span className="inline-flex items-center gap-1.5 text-fg-2 text-[11.5px]">
          <Swatch color={CLASS_META[s.cls as AssetClass].color} />
          {CLASS_META[s.cls as AssetClass].short}
        </span>
      </td>
      <td className="num tnum text-fg-2">{pct(s.weight)}</td>
      <td className="num tnum font-semibold">{pct(s.riskShare)}</td>
      <td
        className="num tnum font-semibold"
        style={{ color: hot ? "var(--color-crisis)" : s.intensity < 0.6 ? "var(--color-safe)" : undefined }}
      >
        {s.intensity.toFixed(2)}x
      </td>
      <td className="num tnum text-fg-2">{pct(s.vol)}</td>
      <td className="num tnum text-fg-2">{s.liquidity.toFixed(2)}</td>
      <td className="num tnum text-fg-3">{inr(s.value)}</td>
    </tr>
  );
}
