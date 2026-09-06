/* The Safe Operating Envelope.

   This replaces the conventional risk gauge. A gauge answers "what is the
   score", which is the least interesting question. The envelope answers the
   question the control loop actually asks: where does the portfolio sit
   inside its permitted operating range, and how much headroom remains before
   it escalates a band and the constraint set tightens.

   A second marker can be supplied to show a projected position — the same
   component then reads as a before/after of a shock, which keeps the mental
   model identical between the Overview and the Stress Studio. */

import { BANDS, REGIMES, headroom, regimeOf } from "../../lib/regime";

interface Props {
  score: number;
  /** Optional projected score, e.g. the post-shock position. */
  projected?: number | null;
  projectedLabel?: string;
  height?: number;
  showScale?: boolean;
}

export function EnvelopeBand({
  score,
  projected = null,
  projectedLabel = "post-shock",
  height = 32,
  showScale = true,
}: Props) {
  const current = regimeOf(score);
  const { next, points } = headroom(score);
  const pos = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
  const hasProjection = projected != null && Math.abs(projected - score) > 0.05;

  return (
    <div className="w-full">
      {/* Band track */}
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex rounded-lg overflow-hidden border border-slate-700/60 shadow-inner">
          {REGIMES.map((key) => {
            const band = BANDS[key];
            const active = key === current;
            return (
              <div
                key={key}
                className="relative h-full transition-colors duration-300"
                style={{
                  width: `${band.to - band.from}%`,
                  backgroundColor: active
                    ? `color-mix(in srgb, ${band.color} 32%, #0f172a)`
                    : `color-mix(in srgb, ${band.color} 10%, #090d16)`,
                  borderRight:
                    key === "CRISIS" ? "none" : "1px solid rgba(51, 65, 85, 0.4)",
                }}
                title={`${band.label} · ${band.from}–${band.to}`}
              >
                <span
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider pointer-events-none select-none"
                  style={{
                    color: active ? band.color : "rgba(148, 163, 184, 0.7)",
                    opacity: active ? 1 : 0.65,
                  }}
                >
                  {band.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Projected marker, drawn under the live marker */}
        {hasProjection && (
          <div
            className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-10"
            style={{
              left: pos(projected),
              background: "rgba(226, 232, 240, 0.8)",
              transition: "left .5s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <span
              className="absolute -top-[17px] -translate-x-1/2 font-mono text-[10px] font-semibold text-slate-300 bg-slate-900/90 px-1 py-0.2 rounded border border-slate-700 whitespace-nowrap shadow"
            >
              {projected.toFixed(1)}
            </span>
          </div>
        )}

        {/* Live marker */}
        <div
          className="absolute -top-1 -bottom-1 pointer-events-none z-20"
          style={{
            left: pos(score),
            transition: "left .5s cubic-bezier(.22,1,.36,1)",
          }}
        >
          <div
            className="w-1.5 h-full -translate-x-1/2 rounded-full ring-2 ring-slate-950 shadow-lg"
            style={{
              background: BANDS[current].color,
            }}
          />
        </div>
      </div>

      {/* Scale */}
      {showScale && (
        <div className="relative h-4 mt-1.5">
          {[0, 30, 60, 80, 100].map((t) => (
            <span
              key={t}
              className="absolute font-mono text-[10px] text-slate-400 -translate-x-1/2 font-medium"
              style={{ left: pos(t) }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Headroom readout — the actual decision input */}
      <div className="flex items-baseline justify-between gap-3 mt-2 flex-wrap text-xs">
        <p className="text-slate-300 leading-snug font-medium">{BANDS[current].stance}</p>
        <p className="text-slate-400 whitespace-nowrap">
          {next ? (
            <>
              <span className="font-mono font-bold text-slate-100">{points.toFixed(1)}</span> pts headroom to{" "}
              <span className="font-semibold" style={{ color: BANDS[next].color }}>{BANDS[next].label}</span>
            </>
          ) : (
            <span className="font-semibold text-rose-400">Hard bounds engaged (Crisis)</span>
          )}
        </p>
      </div>

      {hasProjection && (
        <p className="mt-1 text-[11px] text-slate-400">
          Projected {projectedLabel}: <span className="font-mono text-slate-200 font-semibold">{projected.toFixed(1)}</span>
        </p>
      )}
    </div>
  );
}
