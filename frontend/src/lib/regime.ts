/* Risk regime model.

   Mirrors the backend exactly:
     backend/app/core/constants.py    -> band thresholds
     backend/app/core/risk_levels.py  -> per-regime constraint table
     backend/app/core/formulas.py     -> risk score component weights

   Kept in one place so the UI can show *distance to the next threshold*,
   which is the question the product actually asks: not "what is the score"
   but "how much headroom is left before intervention is required". */

export type Regime = "SAFE" | "WARNING" | "STRESS" | "CRISIS";

export const REGIMES: Regime[] = ["SAFE", "WARNING", "STRESS", "CRISIS"];

export interface RegimeBand {
  key: Regime;
  from: number;
  to: number;
  label: string;
  /** What the control engine does while the portfolio sits in this band. */
  stance: string;
  color: string;
}

export const BANDS: Record<Regime, RegimeBand> = {
  SAFE: {
    key: "SAFE",
    from: 0,
    to: 30,
    label: "Safe",
    stance: "Inside the operating envelope. Hold allocation, avoid turnover.",
    color: "var(--color-safe, #10b981)",
  },
  WARNING: {
    key: "WARNING",
    from: 30,
    to: 60,
    label: "Warning",
    stance: "Envelope tightening. Risk budget narrowed, no forced action yet.",
    color: "var(--color-warning, #f59e0b)",
  },
  STRESS: {
    key: "STRESS",
    from: 60,
    to: 80,
    label: "Stress",
    stance: "Constraints materially tightened. Intervention on breach.",
    color: "var(--color-stress, #f97316)",
  },
  CRISIS: {
    key: "CRISIS",
    from: 80,
    to: 100,
    label: "Crisis",
    stance: "Hard limits engaged. Defensive reallocation required.",
    color: "var(--color-crisis, #ef4444)",
  },
};

export function regimeOf(score: number): Regime {
  if (score < 30) return "SAFE";
  if (score < 60) return "WARNING";
  if (score < 80) return "STRESS";
  return "CRISIS";
}

export function isRegime(value: string): value is Regime {
  return (REGIMES as string[]).includes(value);
}

export function asRegime(value: string | undefined | null): Regime {
  return value && isRegime(value) ? value : "SAFE";
}

/** Headroom, in score points, before the portfolio escalates a band. */
export function headroom(score: number): { next: Regime | null; points: number } {
  const band = BANDS[regimeOf(score)];
  if (band.key === "CRISIS") return { next: null, points: 0 };
  const order = REGIMES.indexOf(band.key);
  return { next: REGIMES[order + 1], points: Math.max(0, band.to - score) };
}

/* Dynamic constraint table — backend/app/core/risk_levels.py */
export interface Constraints {
  max_equity: number;
  min_cash: number;
  max_volatility: number;
  max_drawdown: number;
}

export const CONSTRAINTS: Record<Regime, Constraints> = {
  SAFE: { max_equity: 0.5, min_cash: 0.1, max_volatility: 0.15, max_drawdown: 0.1 },
  WARNING: { max_equity: 0.45, min_cash: 0.12, max_volatility: 0.14, max_drawdown: 0.1 },
  STRESS: { max_equity: 0.35, min_cash: 0.15, max_volatility: 0.12, max_drawdown: 0.08 },
  CRISIS: { max_equity: 0.2, min_cash: 0.2, max_volatility: 0.1, max_drawdown: 0.05 },
};

export const CONSTRAINT_LABELS: Record<keyof Constraints, string> = {
  max_equity: "Max equity",
  min_cash: "Min cash",
  max_volatility: "Max volatility",
  max_drawdown: "Max drawdown",
};

/* Risk score decomposition — backend/app/core/formulas.py::compute_risk_score.
   Recomputed client-side so the UI can attribute the score to its drivers
   rather than presenting an opaque 0-100 number. */

export interface ScoreComponent {
  key: string;
  label: string;
  weight: number;
  /** Raw metric value as returned by /api/risk. */
  raw: number;
  /** Value to show the reader, oriented the same way as the label. */
  display: number;
  /** Normalised 0-100 sub-score. */
  normalised: number;
  /** Points this component contributes to the final score. */
  points: number;
  /** How the raw value maps onto 0-100. */
  basis: string;
}

export function decomposeScore(m: {
  volatility: number;
  max_drawdown: number;
  concentration: number;
  liquidity_ratio: number;
  market_stress: number;
}): ScoreComponent[] {
  const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

  const parts: Array<Omit<ScoreComponent, "points" | "display"> & { display?: number }> = [
    {
      key: "volatility",
      label: "Volatility",
      weight: 0.3,
      raw: m.volatility,
      normalised: clamp01(m.volatility / 0.3) * 100,
      basis: "0% → 0 · 30% → 100",
    },
    {
      key: "drawdown",
      label: "Max drawdown",
      weight: 0.25,
      raw: m.max_drawdown,
      normalised: clamp01(m.max_drawdown / 0.2) * 100,
      basis: "0% → 0 · 20% → 100",
    },
    {
      key: "concentration",
      label: "Concentration",
      weight: 0.2,
      raw: m.concentration,
      normalised: clamp01((m.concentration - 0.2) / 0.8) * 100,
      basis: "HHI 0.20 → 0 · 1.00 → 100",
    },
    {
      key: "liquidity",
      label: "Illiquidity",
      weight: 0.15,
      raw: m.liquidity_ratio,
      display: 1 - m.liquidity_ratio,
      normalised: clamp01(1 - m.liquidity_ratio) * 100,
      basis: "ratio 1.00 → 0 · 0.00 → 100",
    },
    {
      key: "stress",
      label: "Market stress",
      weight: 0.1,
      raw: m.market_stress,
      normalised: clamp01(m.market_stress) * 100,
      basis: "0 → 0 · 1 → 100",
    },
  ];

  return parts.map((p) => ({
    ...p,
    display: p.display ?? p.raw,
    points: p.weight * p.normalised,
  }));
}

/* Live breach detection.

   Mirrors backend/app/services/control_engine.py::evaluate_controls, which
   tests the portfolio against the SAFE (normal) thresholds rather than the
   current band. The backend only returns breaches as part of a scenario run,
   so the same rules are applied here to give the Overview a live posture
   without inventing an endpoint. */

export interface Breach {
  key: string;
  label: string;
  detail: string;
}

export function detectBreaches(m: {
  volatility: number;
  max_drawdown: number;
  liquidity_ratio: number;
  concentration: number;
  market_stress: number;
}): Breach[] {
  const normal = CONSTRAINTS.SAFE;
  const out: Breach[] = [];
  const p = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

  if (m.volatility > normal.max_volatility)
    out.push({
      key: "volatility",
      label: "Volatility limit",
      detail: `Portfolio volatility ${p(m.volatility)} exceeds the ${p(normal.max_volatility, 0)} limit.`,
    });

  if (m.max_drawdown > normal.max_drawdown)
    out.push({
      key: "drawdown",
      label: "Drawdown limit",
      detail: `Maximum drawdown ${p(m.max_drawdown)} exceeds the ${p(normal.max_drawdown, 0)} limit.`,
    });

  if (m.liquidity_ratio < 0.2)
    out.push({
      key: "liquidity",
      label: "Liquidity floor",
      detail: `Liquidity ratio ${p(m.liquidity_ratio)} is below the 20% minimum.`,
    });

  if (m.concentration > 0.3)
    out.push({
      key: "concentration",
      label: "Concentration",
      detail: `Concentration HHI ${m.concentration.toFixed(3)} is elevated above 0.300.`,
    });

  if (m.market_stress > 0.5)
    out.push({
      key: "stress",
      label: "Market stress",
      detail: `Market stress indicator ${m.market_stress.toFixed(2)} is elevated above 0.50.`,
    });

  return out;
}
