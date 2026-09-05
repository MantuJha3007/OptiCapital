/* Shared UI primitives. Deliberately few and plain: the product carries its
   character through data density and the regime accent, not through chrome. */

import type { CSSProperties, ReactNode } from "react";
import { BANDS, type Regime } from "../../lib/regime";

/* ─── Panel ──────────────────────────────────────────────────────────── */

export function Panel({
  title,
  hint,
  actions,
  children,
  className = "",
  bodyClass = "p-4",
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`panel flex flex-col min-w-0 ${className}`}>
      {title && (
        <header className="panel-head justify-between">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h2 className="text-[12.5px] font-semibold tracking-tight text-fg shrink-0">{title}</h2>
            {hint && <p className="text-[11px] text-fg-3 truncate">{hint}</p>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={`${bodyClass} flex-1 min-w-0`}>{children}</div>
    </section>
  );
}

/* ─── Metric ─────────────────────────────────────────────────────────── */

export function Metric({
  label,
  value,
  sub,
  tone = "default",
  size = "md",
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  tone?: "default" | "regime" | "muted";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-[15px]", md: "text-[19px]", lg: "text-[27px]" };
  const tones = {
    default: "text-fg",
    regime: "text-[var(--regime)]",
    muted: "text-fg-2",
  };
  return (
    <div className="min-w-0">
      <div className="label mb-1.5">{label}</div>
      <div className={`num font-semibold leading-none ${sizes[size]} ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-fg-3 leading-snug">{sub}</div>}
    </div>
  );
}

/* ─── Regime pill ────────────────────────────────────────────────────── */

export function RegimePill({
  regime,
  size = "md",
}: {
  regime: Regime;
  size?: "sm" | "md";
}) {
  const band = BANDS[regime];
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[9.5px]" : "px-2 py-[3px] text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-semibold uppercase tracking-[0.09em] ${pad}`}
      style={{
        color: band.color,
        background: `color-mix(in srgb, ${band.color} 13%, transparent)`,
        border: `1px solid color-mix(in srgb, ${band.color} 32%, transparent)`,
      }}
    >
      <i
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: band.color }}
        aria-hidden
      />
      {band.label}
    </span>
  );
}

/* ─── Meter ──────────────────────────────────────────────────────────── */

/** A single horizontal bar. `of` is the value that maps to full width. */
export function Meter({
  value,
  of = 1,
  color = "var(--regime)",
  height = 6,
  track = "var(--color-ink-750)",
  title,
}: {
  value: number;
  of?: number;
  color?: string;
  height?: number;
  track?: string;
  title?: string;
}) {
  const w = Math.max(0, Math.min(1, of === 0 ? 0 : value / of)) * 100;
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: track }}
      title={title}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${w}%`, background: color, transition: "width .5s cubic-bezier(.22,1,.36,1)" }}
      />
    </div>
  );
}

/* ─── Delta ──────────────────────────────────────────────────────────── */

/** Directional change readout. `goodWhen` states which direction is healthy. */
export function Delta({
  from,
  to,
  format,
  goodWhen = "down",
}: {
  from: number;
  to: number;
  format: (v: number) => string;
  goodWhen?: "up" | "down";
}) {
  const diff = to - from;
  const flat = Math.abs(diff) < 1e-9;
  const good = goodWhen === "up" ? diff > 0 : diff < 0;
  const color = flat ? "var(--color-fg-3)" : good ? "var(--color-safe)" : "var(--color-crisis)";
  return (
    <span className="num inline-flex items-center gap-1.5 text-[12.5px]">
      <span className="text-fg-2">{format(from)}</span>
      <span className="text-fg-3" aria-hidden>
        →
      </span>
      <span style={{ color }} className="font-semibold">
        {format(to)}
      </span>
    </span>
  );
}

/* ─── States ─────────────────────────────────────────────────────────── */

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="spin inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        border: "2px solid var(--color-line)",
        borderTopColor: "var(--regime)",
      }}
      aria-hidden
    />
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div
        className="w-9 h-9 rounded-md mb-3.5 border hair"
        style={{ background: "var(--color-ink-800)" }}
        aria-hidden
      />
      <h3 className="text-[13px] font-semibold text-fg-2">{title}</h3>
      <p className="mt-1.5 text-[12px] text-fg-3 max-w-[38ch] leading-relaxed">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ h = 14, w = "100%", style }: { h?: number; w?: string | number; style?: CSSProperties }) {
  return (
    <div
      className="breathe rounded"
      style={{ height: h, width: w, background: "var(--color-ink-750)", ...style }}
      aria-hidden
    />
  );
}

/* ─── Class swatch ───────────────────────────────────────────────────── */

export function Swatch({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <i
      className="inline-block rounded-[2px] shrink-0"
      style={{ width: size, height: size, background: color }}
      aria-hidden
    />
  );
}

/* ─── Section rule with caption ──────────────────────────────────────── */

export function Rule({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <span className="label whitespace-nowrap">{children}</span>
      <span className="flex-1 h-px" style={{ background: "var(--color-line-soft)" }} />
    </div>
  );
}
