/* Capital vs risk attribution.

   The single most important idea in the risk view: a sleeve's share of the
   money is not its share of the danger. A stacked allocation chart hides
   this completely, and two separate charts make the reader do the
   subtraction. So the two quantities share one baseline and grow in
   opposite directions — asymmetry becomes the thing you see first, before
   reading a single number. */

import { CLASS_META, type Sleeve } from "../../lib/exposure";
import { pct } from "../../lib/format";

export function Attribution({
  sleeves,
  onHover,
  hovered,
}: {
  sleeves: Sleeve[];
  onHover?: (id: string | null) => void;
  hovered?: string | null;
}) {
  const rows = [...sleeves].sort((a, b) => b.riskShare - a.riskShare);
  // Shared scale across both sides so the halves stay comparable.
  const scale = Math.max(...rows.map((r) => Math.max(r.weight, r.riskShare)), 0.01);

  return (
    <div className="max-w-[880px] mx-auto w-full">
      <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1.5">
        <span className="flex-1 text-right pr-4">Capital Weight</span>
        <span className="w-[140px] shrink-0 text-center">Exposure Sleeve</span>
        <span className="flex-1 pl-4">Risk Contribution (Euler)</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map((s) => {
          const hot = s.intensity > 1.15;
          const cold = s.intensity < 0.6;
          const active = hovered == null || hovered === s.id;
          return (
            <div
              key={s.id}
              className="flex items-center group py-0.5 rounded transition-opacity"
              style={{ opacity: active ? 1 : 0.35 }}
              onMouseEnter={() => onHover?.(s.id)}
              onMouseLeave={() => onHover?.(null)}
            >
              {/* Capital, growing leftward */}
              <div className="flex-1 flex justify-end items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                  {pct(s.weight)}
                </span>
                <div className="w-full max-w-[190px] flex justify-end">
                  <div
                    className="h-4 rounded-l shadow-sm"
                    style={{
                      width: `${(s.weight / scale) * 100}%`,
                      background: CLASS_META[s.cls]?.color || "#3b82f6",
                      opacity: 0.55,
                      transition: "width .5s cubic-bezier(.22,1,.36,1)",
                    }}
                  />
                </div>
              </div>

              {/* Label spine */}
              <div className="w-[140px] shrink-0 px-2 text-center">
                <span className="text-xs text-slate-200 font-medium truncate block leading-tight">
                  {s.name}
                </span>
              </div>

              {/* Risk, growing rightward */}
              <div className="flex-1 flex items-center gap-2.5 min-w-0">
                <div className="w-full max-w-[190px]">
                  <div
                    className="h-4 rounded-r shadow-sm"
                    style={{
                      width: `${(s.riskShare / scale) * 100}%`,
                      background: hot ? "#ef4444" : (CLASS_META[s.cls]?.color || "#3b82f6"),
                      opacity: hot ? 0.95 : 0.85,
                      transition: "width .5s cubic-bezier(.22,1,.36,1)",
                    }}
                  />
                </div>
                <span
                  className="font-mono text-xs tabular-nums font-semibold shrink-0"
                  style={{ color: hot ? "#f87171" : "#cbd5e1" }}
                >
                  {pct(s.riskShare)}
                </span>
                <span
                  className="font-mono text-[11px] w-12 shrink-0 font-medium"
                  style={{
                    color: hot
                      ? "#f87171"
                      : cold
                        ? "#34d399"
                        : "#94a3b8",
                  }}
                  title="Risk share divided by capital share"
                >
                  {s.intensity.toFixed(2)}x
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2.5">
        The multiplier indicates <strong className="text-slate-300">Risk share ÷ Capital share</strong>. Sleeves above{" "}
        <span className="font-mono font-semibold text-amber-400">1.00x</span> consume disproportionately more risk budget
        than capital — reallocating these sleeves yields the highest marginal safety per unit traded.
      </p>
    </div>
  );
}

/* ─── Compact stacked allocation strip ───────────────────────────────── */

export function AllocationStrip({
  segments,
  height = 28,
}: {
  segments: Array<{ key: string; label: string; weight: number; color: string }>;
  height?: number;
}) {
  return (
    <div>
      <div className="flex w-full rounded-lg overflow-hidden border border-slate-700/60 shadow-inner" style={{ height }}>
        {segments.map((s) => (
          <div
            key={s.key}
            className="relative group transition-all"
            style={{
              width: `${s.weight * 100}%`,
              background: s.color,
              opacity: 0.85,
              borderRight: "1px solid rgba(15, 23, 42, 0.6)",
              transition: "width .5s cubic-bezier(.22,1,.36,1)",
            }}
            title={`${s.label} · ${pct(s.weight)}`}
          >
            {s.weight > 0.08 && (
              <span
                className="font-mono absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-950 select-none"
              >
                {(s.weight * 100).toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-slate-300">
            <i
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: s.color }}
              aria-hidden
            />
            {s.label}
            <span className="font-mono text-slate-400">{pct(s.weight)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
