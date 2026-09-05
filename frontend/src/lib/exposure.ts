/* Exposure model — sleeve decomposition, correlation and risk attribution.

   ── Where the data comes from ────────────────────────────────────────
   The backend holds five asset-class positions (EQUITY, GOV_BONDS,
   CORP_BONDS, GOLD, CASH) and their live weights arrive from
   /api/portfolio. Five nodes is too coarse to reveal contagion, so each
   class is decomposed into the sleeves an institutional book would
   actually hold. Sleeve weights are always derived from the live class
   weight (share x classWeight), so the model stays anchored to real
   backend state; only the intra-class shares and the correlation matrix
   are local.

   When the backend grows a /api/correlation endpoint, replace
   CLASS_CORRELATION and SLEEVES with the response — every consumer reads
   through buildExposure() and needs no other change.

   ── The maths ────────────────────────────────────────────────────────
   Covariance      Sigma_ij = rho_ij * sigma_i * sigma_j
   Portfolio vol   sigma_p  = sqrt(w' Sigma w)
   Marginal risk   MCR_i    = (Sigma w)_i / sigma_p
   Risk contrib.   RC_i     = w_i * MCR_i          (sums to sigma_p)

   This is the standard Euler decomposition. It is what makes the central
   insight of the risk view real rather than decorative: a sleeve's share
   of portfolio RISK is not its share of CAPITAL. */

export type AssetClass = "EQUITY" | "GOV_BONDS" | "CORP_BONDS" | "GOLD" | "CASH";

export const CLASS_META: Record<AssetClass, { label: string; short: string; color: string }> = {
  EQUITY: { label: "Equity", short: "EQ", color: "var(--color-ac-equity)" },
  GOV_BONDS: { label: "Government Bonds", short: "GOV", color: "var(--color-ac-gov)" },
  CORP_BONDS: { label: "Corporate Bonds", short: "CORP", color: "var(--color-ac-corp)" },
  GOLD: { label: "Gold", short: "GOLD", color: "var(--color-ac-gold)" },
  CASH: { label: "Cash", short: "CASH", color: "var(--color-ac-cash)" },
};

export const CLASS_ORDER: AssetClass[] = ["EQUITY", "GOV_BONDS", "CORP_BONDS", "GOLD", "CASH"];

interface SleeveDef {
  id: string;
  name: string;
  cls: AssetClass;
  /** Share of the parent class. Shares within a class sum to 1. */
  share: number;
  vol: number;
  liquidity: number;
}

/* Intra-class sleeve structure. Volatilities are set so that each class
   weighted sleeve volatility reconciles with the class volatility seeded in
   backend/app/seed/seed_database.py. */
const SLEEVES: SleeveDef[] = [
  // EQUITY — class vol 0.22
  { id: "eq-large", name: "Large Cap Core", cls: "EQUITY", share: 0.3, vol: 0.19, liquidity: 0.95 },
  { id: "eq-mid", name: "Mid & Small Cap", cls: "EQUITY", share: 0.18, vol: 0.28, liquidity: 0.78 },
  { id: "eq-it", name: "IT Services", cls: "EQUITY", share: 0.18, vol: 0.24, liquidity: 0.92 },
  { id: "eq-bank", name: "Banking & Financials", cls: "EQUITY", share: 0.22, vol: 0.26, liquidity: 0.9 },
  { id: "eq-global", name: "Global Equity", cls: "EQUITY", share: 0.12, vol: 0.2, liquidity: 0.86 },

  // GOV_BONDS — class vol 0.06
  { id: "gov-10y", name: "Sovereign 10Y", cls: "GOV_BONDS", share: 0.45, vol: 0.07, liquidity: 0.96 },
  { id: "gov-2y", name: "Sovereign 2Y", cls: "GOV_BONDS", share: 0.3, vol: 0.035, liquidity: 0.98 },
  { id: "gov-sdl", name: "State Development Loans", cls: "GOV_BONDS", share: 0.25, vol: 0.065, liquidity: 0.88 },

  // CORP_BONDS — class vol 0.10
  { id: "corp-aaa", name: "AAA Corporate", cls: "CORP_BONDS", share: 0.45, vol: 0.075, liquidity: 0.8 },
  { id: "corp-aa", name: "AA Corporate", cls: "CORP_BONDS", share: 0.3, vol: 0.125, liquidity: 0.62 },
  { id: "corp-fin", name: "Financial Sector Credit", cls: "CORP_BONDS", share: 0.25, vol: 0.115, liquidity: 0.66 },

  // GOLD — class vol 0.15
  { id: "gold-etf", name: "Gold ETF", cls: "GOLD", share: 0.6, vol: 0.15, liquidity: 0.9 },
  { id: "gold-sgb", name: "Sovereign Gold Bonds", cls: "GOLD", share: 0.4, vol: 0.145, liquidity: 0.78 },

  // CASH — class vol 0.01
  { id: "cash-onl", name: "Overnight Liquid", cls: "CASH", share: 0.65, vol: 0.004, liquidity: 1.0 },
  { id: "cash-tbill", name: "Treasury Bills", cls: "CASH", share: 0.35, vol: 0.012, liquidity: 0.99 },
];

/* Cross-class correlation. Reflects the regime the backend seeds: equities
   and credit co-move, government paper and credit share a rate factor, gold
   is a partial equity hedge, cash is uncorrelated. Diagonal entries are the
   default within-class correlation between two different sleeves. */
const CLASS_CORRELATION: Record<AssetClass, Record<AssetClass, number>> = {
  EQUITY: { EQUITY: 0.72, GOV_BONDS: -0.15, CORP_BONDS: 0.35, GOLD: -0.1, CASH: 0.0 },
  GOV_BONDS: { EQUITY: -0.15, GOV_BONDS: 0.86, CORP_BONDS: 0.72, GOLD: 0.18, CASH: 0.05 },
  CORP_BONDS: { EQUITY: 0.35, GOV_BONDS: 0.72, CORP_BONDS: 0.82, GOLD: 0.05, CASH: 0.02 },
  GOLD: { EQUITY: -0.1, GOV_BONDS: 0.18, CORP_BONDS: 0.05, GOLD: 0.96, CASH: 0.0 },
  CASH: { EQUITY: 0.0, GOV_BONDS: 0.05, CORP_BONDS: 0.02, GOLD: 0.0, CASH: 0.93 },
};

/* Sleeve pairs whose correlation is not explained by their asset classes.
   These are the contagion channels the product exists to surface: a bank
   equity sleeve and a financial-sector credit sleeve sit in different asset
   classes and look diversified on an allocation chart, but they are the same
   underlying exposure. */
const PAIR_OVERRIDES: Array<[string, string, number, string]> = [
  ["eq-bank", "corp-fin", 0.81, "Same financial-sector credit cycle, held as both equity and debt"],
  ["eq-it", "eq-global", 0.79, "IT services revenue is priced off global demand and the USD"],
  ["eq-large", "eq-bank", 0.83, "Financials dominate large-cap index weight"],
  ["corp-aa", "corp-fin", 0.86, "Overlapping issuer base below AAA"],
  ["gov-10y", "corp-aaa", 0.78, "Shared duration factor; AAA spread is stable"],
  ["eq-mid", "corp-aa", 0.52, "Both sensitive to domestic credit availability"],
];

const overrideKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const OVERRIDE_MAP = new Map<string, { rho: number; why: string }>(
  PAIR_OVERRIDES.map(([a, b, rho, why]) => [overrideKey(a, b), { rho, why }]),
);

export interface Sleeve {
  id: string;
  name: string;
  cls: AssetClass;
  /** Live weight: parent class weight x intra-class share. */
  weight: number;
  value: number;
  vol: number;
  liquidity: number;
  /** Share of total portfolio risk, 0-1. Euler decomposition. */
  riskShare: number;
  /** riskShare / weight. Above 1 means the sleeve punches above its capital. */
  intensity: number;
}

export interface Edge {
  source: string;
  target: string;
  rho: number;
  /** Set when the pair is more correlated than its asset classes imply. */
  hidden: string | null;
}

export interface Cluster {
  id: string;
  members: string[];
  /** Combined capital weight of the cluster — the real concentration. */
  weight: number;
  riskShare: number;
  avgRho: number;
  crossClass: boolean;
}

export interface Exposure {
  sleeves: Sleeve[];
  edges: Edge[];
  clusters: Cluster[];
  /** Annualised portfolio volatility implied by this model. */
  modelVol: number;
  byId: Map<string, Sleeve>;
}

function correlation(a: SleeveDef, b: SleeveDef): number {
  if (a.id === b.id) return 1;
  const override = OVERRIDE_MAP.get(overrideKey(a.id, b.id));
  if (override) return override.rho;
  return CLASS_CORRELATION[a.cls][b.cls];
}

/** Correlation threshold at which an edge is considered meaningful. */
export const EDGE_THRESHOLD = 0.3;

/** Correlation at which two sleeves are treated as one risk cluster.

   Set above the default within-class correlations (0.72-0.86). Clustering is
   single-linkage, so a lower bar chains every sleeve into one component and
   the measure stops discriminating — at 0.80 a cluster means the members
   genuinely move as one position. */
export const CLUSTER_THRESHOLD = 0.8;

/**
 * Build the full exposure model from live asset-class weights.
 *
 * @param classWeights live weights keyed by backend symbol, e.g. { EQUITY: 0.45 }
 * @param totalCapital portfolio capital, used to money-denominate sleeves
 */
export function buildExposure(
  classWeights: Partial<Record<AssetClass, number>>,
  totalCapital: number,
): Exposure {
  const defs = SLEEVES.filter((s) => (classWeights[s.cls] ?? 0) > 0);
  const weights = defs.map((s) => (classWeights[s.cls] ?? 0) * s.share);
  const n = defs.length;

  // Covariance and portfolio volatility
  const sigma: number[][] = defs.map((a, i) =>
    defs.map((b, j) => (i === j ? a.vol * a.vol : correlation(a, b) * a.vol * b.vol)),
  );

  const sigmaW = weights.map((_, i) => weights.reduce((acc, wj, j) => acc + sigma[i][j] * wj, 0));
  const variance = weights.reduce((acc, wi, i) => acc + wi * sigmaW[i], 0);
  const modelVol = Math.sqrt(Math.max(variance, 1e-12));

  // Euler risk contributions — these sum to modelVol by construction
  const contributions = weights.map((wi, i) => (wi * sigmaW[i]) / modelVol);
  const totalContribution = contributions.reduce((a, b) => a + b, 0) || 1;

  const sleeves: Sleeve[] = defs.map((d, i) => {
    const weight = weights[i];
    const riskShare = contributions[i] / totalContribution;
    return {
      id: d.id,
      name: d.name,
      cls: d.cls,
      weight,
      value: weight * totalCapital,
      vol: d.vol,
      liquidity: d.liquidity,
      riskShare,
      intensity: weight > 1e-6 ? riskShare / weight : 0,
    };
  });

  // Edges above the meaningful-correlation threshold
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const rho = correlation(defs[i], defs[j]);
      if (Math.abs(rho) < EDGE_THRESHOLD) continue;
      const override = OVERRIDE_MAP.get(overrideKey(defs[i].id, defs[j].id));
      const implied = CLASS_CORRELATION[defs[i].cls][defs[j].cls];
      edges.push({
        source: defs[i].id,
        target: defs[j].id,
        rho,
        hidden: override && rho > implied + 0.15 ? override.why : null,
      });
    }
  }

  const byId = new Map(sleeves.map((s) => [s.id, s]));
  return { sleeves, edges, clusters: findClusters(sleeves, edges, byId), modelVol, byId };
}

/**
 * Connected components over edges at or above CLUSTER_THRESHOLD.
 *
 * This is the measurement HHI cannot make. HHI sees five positions and calls
 * the book diversified; a cluster search sees that several of them move as
 * one, and reports their combined weight as the true concentration.
 */
function findClusters(sleeves: Sleeve[], edges: Edge[], byId: Map<string, Sleeve>): Cluster[] {
  const parent = new Map<string, string>(sleeves.map((s) => [s.id, s.id]));

  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== cur) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const strong = edges.filter((e) => e.rho >= CLUSTER_THRESHOLD);
  strong.forEach((e) => union(e.source, e.target));

  const groups = new Map<string, string[]>();
  sleeves.forEach((s) => {
    const root = find(s.id);
    const list = groups.get(root);
    if (list) list.push(s.id);
    else groups.set(root, [s.id]);
  });

  const clusters: Cluster[] = [];
  groups.forEach((members, root) => {
    if (members.length < 2) return;
    const inner = strong.filter((e) => members.includes(e.source) && members.includes(e.target));
    const avgRho = inner.length
      ? inner.reduce((a, e) => a + e.rho, 0) / inner.length
      : CLUSTER_THRESHOLD;
    const classes = new Set(members.map((m) => byId.get(m)!.cls));
    clusters.push({
      id: root,
      members,
      weight: members.reduce((a, m) => a + byId.get(m)!.weight, 0),
      riskShare: members.reduce((a, m) => a + byId.get(m)!.riskShare, 0),
      avgRho,
      crossClass: classes.size > 1,
    });
  });

  return clusters.sort((a, b) => b.weight - a.weight);
}

/** Human-readable name for a cluster, derived from its members. */
export function clusterName(cluster: Cluster, byId: Map<string, Sleeve>): string {
  const members = cluster.members.map((m) => byId.get(m)!);
  if (cluster.crossClass) {
    const classes = CLASS_ORDER.filter((c) => members.some((m) => m.cls === c));
    return `${classes.map((c) => CLASS_META[c].short).join(" + ")} complex`;
  }
  return `${CLASS_META[members[0].cls].label} block`;
}
