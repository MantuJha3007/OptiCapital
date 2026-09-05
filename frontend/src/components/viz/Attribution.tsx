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
    <div className="max-w-[880px] mx-auto">
      <div className="flex items-center text-[9.5px] font-semibold uppercase tracking-[0.09em] text-fg-3 mb-2">
        <span className="flex-1 text-right pr-2">Capital</span>
        <span className="w-[132px] shrink-0" />
        <span className="flex-1 pl-2">Risk contribution</span>
      </div>

      <div className="flex flex-col gap-[3px]">
        {rows.map((s) => {
          const hot = s.intensity > 1.15;
          const cold = s.intensity < 0.6;
          const active = hovered == null || hovered === s.id;
          return (
            <div
              key={s.id}
              className="flex items-center group"
              style={{ opacity: active ? 1 : 0.34, transition: "opacity .15s ease" }}
              onMouseEnter={() => onHover?.(s.id)}
              onMouseLeave={() => onHover?.(null)}
            >
              {/* Capital, growing leftward */}
              <div className="flex-1 flex justify-end items-center gap-2 min-w-0">
                <span className="num text-[10.5px] text-fg-3 tabular-nums shrink-0">
                  {pct(s.weight)}
                </span>
                <div className="w-full max-w-[190px] flex justify-end">
                  <div
                    className="h-[15px] rounded-l-[2px]"
                    style={{
                      width: `${(s.weight / scale) * 100}%`,
                      background: CLASS_META[s.cls].color,
                      opacity: 0.42,
                      transition: "width .5s cubic-bezier(.22,1,.36,1)",
                    }}
                  />
                </div>
              </div>

              {/* Label spine */}
              <div className="w-[132px] shrink-0 px-2.5 text-center">
                <span className="text-[11px] text-fg-2 truncate block leading-tight">{s.name}</span>
              </div>

              {/* Risk, growing rightward */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="w-full max-w-[190px]">
                  <div
                    className="h-[15px] rounded-r-[2px]"
                    style={{
                      width: `${(s.riskShare / scale) * 100}%`,
                      background: hot ? "var(--color-crisis)" : CLASS_META[s.cls].color,
                      opacity: hot ? 0.85 : 0.82,
                      transition: "width .5s cubic-bezier(.22,1,.36,1)",
                    }}
                  />
                </div>
                <span
                  className="num text-[10.5px] tabular-nums shrink-0"
                  style={{ color: hot ? "var(--color-crisis)" : "var(--color-fg-2)" }}
                >
                  {pct(s.riskShare)}
                </span>
                <span
                  className="num text-[10px] w-[42px] shrink-0"
                  style={{
                    color: hot
                      ? "var(--color-crisis)"
                      : cold
                        ? "var(--color-safe)"
                        : "var(--color-fg-3)",
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

      <p className="mt-3.5 text-[11px] text-fg-3 leading-relaxed">
        The multiplier is risk share ÷ capital share. Above{" "}
        <span className="num text-fg-2">1.00x</span> a sleeve consumes more of the risk budget
        than of the capital — that is where a reduction buys the most safety per rupee moved.
      </p>
    </div>
  );
}

/* ─── Compact stacked allocation strip ───────────────────────────────── */

export function AllocationStrip({
  segments,
  height = 26,
}: {
  segments: Array<{ key: string; label: string; weight: number; color: string }>;
  height?: number;
}) {
  return (
    <div>
      <div className="flex w-full rounded overflow-hidden" style={{ height }}>
        {segments.map((s) => (
          <div
            key={s.key}
            className="relative group"
            style={{
              width: `${s.weight * 100}%`,
              background: s.color,
              opacity: 0.78,
              borderRight: "1px solid var(--color-ink-850)",
              transition: "width .5s cubic-bezier(.22,1,.36,1)",
            }}
            title={`${s.label} · ${pct(s.weight)}`}
          >
            {s.weight > 0.09 && (
              <span
                className="num absolute inset-0 flex items-center justify-center text-[10px] font-semibold"
                style={{ color: "var(--color-ink-950)" }}
              >
                {(s.weight * 100).toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-fg-2">
            <i
              className="w-2 h-2 rounded-[2px] shrink-0"
              style={{ background: s.color }}
              aria-hidden
            />
            {s.label}
            <span className="num text-fg-3">{pct(s.weight)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
