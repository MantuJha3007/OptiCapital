/* Formatting helpers. All numeric output in the product flows through here
   so that precision and units stay consistent across every view. */

export function inr(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

export function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function signedPct(value: number, digits = 1): string {
  const s = (value * 100).toFixed(digits);
  return `${value > 0 ? "+" : ""}${s}%`;
}

export function num(value: number, digits = 1): string {
  return value.toFixed(digits);
}

/** Basis points — the natural unit for small allocation deltas. */
export function bps(value: number): string {
  return `${value > 0 ? "+" : ""}${Math.round(value * 10_000)} bp`;
}

export function timestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const mins = Math.round((Date.now() - d) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}
