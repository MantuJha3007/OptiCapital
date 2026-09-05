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
  height = 30,
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
        <div className="absolute inset-0 flex rounded overflow-hidden">
          {REGIMES.map((key) => {
            const band = BANDS[key];
            const active = key === current;
            return (
              <div
                key={key}
                className="relative h-full"
                style={{
                  width: `${band.to - band.from}%`,
                  background: active
                    ? `color-mix(in srgb, ${band.color} 26%, var(--color-ink-800))`
                    : `color-mix(in srgb, ${band.color} 7%, var(--color-ink-850))`,
                  borderRight:
                    key === "CRISIS" ? "none" : "1px solid var(--color-ink-900)",
                  transition: "background .45s ease",
                }}
                title={`${band.label} · ${band.from}–${band.to}`}
              >
                <span
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.09em] pointer-events-none select-none"
                  style={{
                    color: active ? band.color : "var(--color-fg-3)",
                    opacity: active ? 1 : 0.55,
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
            className="absolute top-0 bottom-0 w-px pointer-events-none"
            style={{
              left: pos(projected),
              background: "var(--color-fg-2)",
              opacity: 0.6,
              transition: "left .5s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <span
              className="absolute -top-[15px] -translate-x-1/2 num text-[10px] whitespace-nowrap"
              style={{ color: "var(--color-fg-2)" }}
            >
              {projected.toFixed(0)}
            </span>
          </div>
        )}

        {/* Live marker */}
        <div
          className="absolute -top-1 -bottom-1 pointer-events-none"
          style={{
            left: pos(score),
            transition: "left .5s cubic-bezier(.22,1,.36,1)",
          }}
        >
          <div
            className="w-[3px] h-full -translate-x-1/2 rounded-full"
            style={{
              background: BANDS[current].color,
              boxShadow: `0 0 0 2px var(--color-ink-850)`,
            }}
          />
        </div>
      </div>

      {/* Scale */}
      {showScale && (
        <div className="relative h-4 mt-1">
          {[0, 30, 60, 80, 100].map((t) => (
            <span
              key={t}
              className="absolute num text-[9.5px] text-fg-3 -translate-x-1/2"
              style={{ left: pos(t) }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Headroom readout — the actual decision input */}
      <div className="flex items-baseline justify-between gap-3 mt-1.5 flex-wrap">
        <p className="text-[11.5px] text-fg-2 leading-snug">{BANDS[current].stance}</p>
        <p className="text-[11.5px] text-fg-3 whitespace-nowrap">
          {next ? (
            <>
              <span className="num font-semibold text-fg">{points.toFixed(1)}</span> pts of
              headroom before <span style={{ color: BANDS[next].color }}>{BANDS[next].label}</span>
            </>
          ) : (
            <span style={{ color: BANDS.CRISIS.color }}>Top of scale — hard limits engaged</span>
          )}
        </p>
      </div>

      {hasProjection && (
        <p className="mt-1 text-[11px] text-fg-3">
          Grey marker is the {projectedLabel} position at{" "}
          <span className="num text-fg-2">{projected.toFixed(1)}</span>.
        </p>
      )}
    </div>
  );
}
