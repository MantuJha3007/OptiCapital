/* Scenario Stress Studio.

   Structured as the pipeline the engine actually runs, in order, so the
   reader can see cause become consequence become decision:

     baseline -> shock -> risk transformation -> control response
              -> minimum intervention -> validation -> decision

   The shocks are the real per-asset shocks stored with each scenario, shown
   before the run rather than after, so the user knows what they are about to
   apply. Nothing here is simulated in the browser: every number below the
   baseline comes from POST /api/scenarios/run. */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, FlaskConical, Play, X } from "lucide-react";
import { api, ApiError } from "../api";
import { useReadySystem } from "../store/system";
import { Metric, Panel, Meter, RegimePill, Rule, Spinner, Swatch, Empty } from "../components/ui/primitives";
import { EnvelopeBand } from "../components/viz/EnvelopeBand";
import { CLASS_META, type AssetClass } from "../lib/exposure";
import { CONSTRAINTS, CONSTRAINT_LABELS, asRegime, type Constraints } from "../lib/regime";
import { bps, inr, pct, signedPct } from "../lib/format";
import type { Scenario, ScenarioRunResponse } from "../types";

const STAGES = [
  "Baseline captured",
  "Shock applied",
  "Risk recomputed",
  "Control response",
  "Optimiser solved",
  "Recommendation validated",
];

export default function StressStudio() {
  const { data, lastRun, setLastRun, lastRunDecision, setLastRunDecision, refresh, notify } =
    useReadySystem();
  const [selected, setSelected] = useState<Scenario | null>(data.scenarios[0] ?? null);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);

  const run = async () => {
    if (!selected) return;
    setRunning(true);
    setError(null);
    setLastRun(null);
    setStage(0);
    try {
      const result = await api.runScenario(selected.id);
      // The engine has completed every stage by now; step through them so the
      // pipeline is legible rather than arriving as an undifferentiated wall.
      for (let i = 1; i <= STAGES.length; i++) {
        await new Promise((r) => setTimeout(r, 110));
        setStage(i);
      }
      setLastRun(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Scenario run failed.");
    } finally {
      setRunning(false);
    }
  };

  const decide = async (approved: boolean) => {
    if (!lastRun) return;
    setDeciding(true);
    try {
      await api.rebalance(lastRun.recommendation.optimization_id, approved);
      setLastRunDecision(approved ? "approved" : "rejected");
      notify(
        approved
          ? "Rebalance approved — holdings updated and the decision is recorded in the ledger."
          : "Rebalance rejected — the decision is recorded in the ledger.",
      );
      // The result deliberately stays on screen. Clearing it here destroyed
      // the confirmation at the exact moment it was created, dropping the user
      // back to an empty pane with no record of what they had just approved.
      await refresh();
    } catch (e) {
      notify(e instanceof ApiError ? e.message : "Could not record the decision.");
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4 rise">
      {/* ── Scenario bench ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Panel title="Scenario library" hint={`${data.scenarios.length} defined`} bodyClass="p-2">
          <div className="flex flex-col gap-1">
            {data.scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className="text-left rounded px-2.5 py-2.5 transition-colors border"
                style={{
                  borderColor:
                    selected?.id === s.id ? "rgb(var(--regime-rgb) / 0.45)" : "transparent",
                  background:
                    selected?.id === s.id ? "rgb(var(--regime-rgb) / 0.09)" : "transparent",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium">{s.name}</span>
                  <Severity shocks={s.shocks} />
                </div>
                {s.description && (
                  <p className="text-[11px] text-fg-3 mt-1 leading-snug">{s.description}</p>
                )}
              </button>
            ))}
          </div>
        </Panel>

        {selected && (
          <Panel title="Shock composition" hint="Applied per asset class">
            <div className="flex flex-col gap-2.5">
              {[...selected.shocks]
                .sort((a, b) => a.shock_percentage - b.shock_percentage)
                .map((sh) => (
                  <ShockRow key={sh.asset_symbol} symbol={sh.asset_symbol} name={sh.asset_name} value={sh.shock_percentage} />
                ))}
            </div>
            <button
              className="btn btn-primary w-full mt-4"
              onClick={() => void run()}
              disabled={running}
            >
              {running ? <Spinner size={13} /> : <Play size={13} />}
              {running ? "Running engine…" : "Run stress test"}
            </button>
            {running && (
              <ol className="mt-3.5 flex flex-col gap-1.5">
                {STAGES.map((label, i) => (
                  <li key={label} className="flex items-center gap-2 text-[11px]">
                    {i < stage ? (
                      <CheckCircle2 size={12} style={{ color: "var(--regime)" }} />
                    ) : (
                      <span
                        className="w-3 h-3 rounded-full border shrink-0"
                        style={{ borderColor: "var(--color-line)" }}
                      />
                    )}
                    <span style={{ color: i < stage ? "var(--color-fg-2)" : "var(--color-fg-3)" }}>
                      {label}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        )}
      </div>

      {/* ── Results ───────────────────────────────────────────────────── */}
      <div className="min-w-0">
        {error && (
          <div
            className="panel p-4 mb-4 flex items-start gap-3"
            style={{ borderColor: "var(--color-crisis)" }}
          >
            <AlertTriangle size={16} style={{ color: "var(--color-crisis)" }} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-[12.5px] font-medium">Scenario run failed</p>
              <p className="text-[11.5px] text-fg-3 mt-0.5">{error}</p>
            </div>
            <button className="btn btn-quiet ml-auto shrink-0" onClick={() => setError(null)}>
              <X size={13} />
            </button>
          </div>
        )}

        {lastRun ? (
          <Result
            run={lastRun}
            capital={data.portfolio.total_capital}
            currentWeights={weightMap(data)}
            decided={lastRunDecision}
            deciding={deciding}
            onDecide={decide}
          />
        ) : (
          !running && (
            <Panel bodyClass="p-0">
              <Empty
                title="No scenario has been run"
                body="Pick a scenario and run it. The engine will shock the book, recompute risk, tighten the control limits, solve for the smallest reallocation that restores safety, and hand back a decision."
                action={
                  selected ? (
                    <button className="btn btn-primary" onClick={() => void run()}>
                      <FlaskConical size={13} /> Run {selected.name}
                    </button>
                  ) : undefined
                }
              />
            </Panel>
          )
        )}

        {running && !lastRun && (
          <Panel bodyClass="p-0">
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Spinner size={20} />
              <p className="text-[12px] text-fg-3">{STAGES[Math.min(stage, STAGES.length - 1)]}…</p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */

function Result({
  run,
  capital,
  currentWeights,
  decided,
  deciding,
  onDecide,
}: {
  run: ScenarioRunResponse;
  capital: number;
  currentWeights: Map<string, { weight: number; name: string; symbol: AssetClass }>;
  decided: "approved" | "rejected" | null;
  deciding: boolean;
  onDecide: (approved: boolean) => void;
}) {
  const beforeRegime = asRegime(run.before.risk_level);
  const afterRegime = asRegime(run.after_shock.risk_level);
  const escalated = beforeRegime !== afterRegime;
  const rec = run.recommendation;
  const holds = rec.action === "HOLD";

  const beforeLimits = CONSTRAINTS[beforeRegime];
  const afterLimits = (run.control.constraints as unknown as Constraints) ?? CONSTRAINTS[afterRegime];

  // The recommendation is measured against the book AFTER the shock, not
  // before it: that is the baseline the engine used for turnover, cost and
  // its own explanation. Comparing against pre-shock weights here would make
  // the table disagree with the reasoning printed beside it.
  const moves = useMemo(() => {
    const postShock = run.shock.weights_after;
    return Object.entries(rec.allocation)
      .map(([key, target]) => {
        const cur = currentWeights.get(key);
        const from = postShock?.[key] ?? cur?.weight ?? 0;
        return {
          key,
          name: cur?.name ?? key.toUpperCase(),
          symbol: (cur?.symbol ?? "CASH") as AssetClass,
          from,
          to: target,
          diff: target - from,
        };
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [rec.allocation, currentWeights, run.shock.weights_after]);

  const traded = moves.filter((mv) => Math.abs(mv.diff) >= 0.005);
  const costPct = capital > 0 ? rec.transaction_cost / capital : 0;

  return (
    <div className="flex flex-col gap-4 rise">
      {/* 1 — Impact headline */}
      <section className="panel p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[16px] font-semibold tracking-tight">{run.scenario.name}</h2>
              <RegimePill regime={afterRegime} size="sm" />
            </div>
            {run.scenario.description && (
              <p className="text-[11.5px] text-fg-3 mt-1">{run.scenario.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11.5px]">
            <RegimePill regime={beforeRegime} size="sm" />
            <ArrowRight size={13} className="text-fg-3" />
            <RegimePill regime={afterRegime} size="sm" />
            {escalated && <span className="text-fg-3">regime escalated</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Metric
            label="Capital impact"
            value={signedPct(run.shock.portfolio_loss)}
            tone="regime"
            size="lg"
            sub={`${inr(run.before.portfolio_value)} → ${inr(run.shock.portfolio_value_after)}`}
          />
          <Metric
            label="Value at risk"
            value={inr(Math.abs(run.before.portfolio_value - run.shock.portfolio_value_after))}
            sub="Mark-to-market loss on impact"
          />
          <Metric
            label="Risk score"
            value={run.after_shock.risk_score.toFixed(1)}
            sub={`from ${run.before.risk_score.toFixed(1)} · ${
              run.after_shock.risk_score > run.before.risk_score ? "+" : ""
            }${(run.after_shock.risk_score - run.before.risk_score).toFixed(1)} pts`}
          />
          <Metric
            label="Limits breached"
            value={String(run.control.breaches.length)}
            tone={run.control.breaches.length ? "regime" : "default"}
            sub={run.control.breaches.length ? "Control response engaged" : "Inside all limits"}
          />
        </div>

        <div className="mt-6 pt-5 border-t hair">
          <Rule>Position inside the envelope</Rule>
          <div className="mt-3">
            <EnvelopeBand score={run.after_shock.risk_score} projected={run.before.risk_score} projectedLabel="pre-shock" />
          </div>
        </div>
      </section>

      {/* 2 — Risk transformation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="Risk transformation" hint="Baseline against post-shock">
          <table className="grid">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="tnum">Baseline</th>
                <th className="tnum">After shock</th>
                <th className="tnum">Change</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow label="Risk score" before={run.before.risk_score} after={run.after_shock.risk_score} fmt={(v) => v.toFixed(1)} />
              <MetricRow label="Volatility" before={run.before.volatility} after={run.after_shock.volatility} fmt={(v) => pct(v)} />
              <MetricRow label="Max drawdown" before={run.before.drawdown} after={run.after_shock.drawdown} fmt={(v) => pct(v)} />
              <MetricRow label="Liquidity ratio" before={run.before.liquidity} after={run.after_shock.liquidity} fmt={(v) => pct(v)} goodWhen="up" />
            </tbody>
          </table>
        </Panel>

        <Panel title="Control response" hint={`${afterRegime} constraint set engaged`}>
          <table className="grid">
            <thead>
              <tr>
                <th>Limit</th>
                <th className="tnum">Was</th>
                <th className="tnum">Now</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(CONSTRAINT_LABELS) as Array<keyof Constraints>).map((k) => {
                const was = beforeLimits[k];
                const now = afterLimits[k] ?? was;
                const tightened = k === "min_cash" ? now > was : now < was;
                return (
                  <tr key={k}>
                    <td className="text-fg-2">{CONSTRAINT_LABELS[k]}</td>
                    <td className="num tnum text-fg-3">{pct(was, 0)}</td>
                    <td
                      className="num tnum font-semibold"
                      style={{ color: tightened ? "var(--regime)" : undefined }}
                    >
                      {pct(now, 0)}
                      {tightened && <span className="text-[10px] ml-1">tightened</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {run.control.breaches.length > 0 && (
            <div className="mt-4 pt-3.5 border-t hair">
              <Rule>Breaches</Rule>
              <ul className="flex flex-col gap-1.5 mt-2">
                {run.control.breaches.map((b, i) => (
                  <li
                    key={i}
                    className="text-[11.5px] text-fg-2 pl-3 border-l leading-relaxed"
                    style={{ borderColor: "var(--regime)" }}
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* 3 — Minimum intervention */}
      <Panel
        title={holds ? "No intervention required" : "Minimum necessary intervention"}
        hint={
          holds
            ? "The book stays inside its envelope under this shock"
            : "Smallest reallocation that restores the envelope"
        }
        actions={
          <span
            className="num text-[11px] px-2 py-0.5 rounded"
            style={{
              color: holds ? "var(--color-safe)" : "var(--regime)",
              background: holds
                ? "color-mix(in srgb, var(--color-safe) 12%, transparent)"
                : "rgb(var(--regime-rgb) / 0.13)",
            }}
          >
            {rec.action.replace(/_/g, " ")}
          </span>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
          <Metric label="Turnover" value={pct(rec.turnover)} sub="Total absolute weight moved" />
          <Metric
            label="Transaction cost"
            value={inr(rec.transaction_cost)}
            sub={`${pct(costPct, 3)} of capital at 0.1%`}
          />
          <Metric
            label="Positions traded"
            value={`${traded.length} of ${moves.length}`}
            sub="Everything else is left alone"
          />
          <Metric
            label="Risk after action"
            value={rec.risk_after.toFixed(1)}
            tone="regime"
            sub={`from ${rec.risk_before.toFixed(1)} · ${(rec.risk_after - rec.risk_before).toFixed(1)} pts`}
          />
        </div>

        <Rule>
          {run.shock.weights_after
            ? "Proposed allocation, against the post-shock book"
            : "Proposed allocation"}
        </Rule>
        <div className="overflow-x-auto mt-3">
          <table className="grid min-w-[560px]">
            <thead>
              <tr>
                <th>Asset class</th>
                <th className="tnum">
                  {run.shock.weights_after ? "Post-shock" : "Current"}
                </th>
                <th className="tnum">Proposed</th>
                <th className="tnum">Change</th>
                <th className="w-[170px]">Movement</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((mv) => {
                const material = Math.abs(mv.diff) >= 0.005;
                const color = CLASS_META[mv.symbol]?.color ?? "var(--color-fg-3)";
                return (
                  <tr key={mv.key} style={material ? undefined : { opacity: 0.5 }}>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <Swatch color={color} />
                        {mv.name}
                      </span>
                    </td>
                    <td className="num tnum text-fg-2">{pct(mv.from)}</td>
                    <td className="num tnum font-semibold">{pct(mv.to)}</td>
                    <td
                      className="num tnum"
                      style={{
                        color: !material
                          ? "var(--color-fg-3)"
                          : mv.diff > 0
                            ? "var(--color-safe)"
                            : "var(--color-crisis)",
                      }}
                    >
                      {material ? bps(mv.diff) : "—"}
                    </td>
                    <td>
                      <DeltaBar diff={mv.diff} color={color} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!holds && (
          <p className="mt-3.5 text-[11.5px] text-fg-3 leading-relaxed max-w-[92ch]">
            {traded.length} of {moves.length} positions move. The objective penalises turnover, so
            the optimiser trades only as far as the constraint set requires rather than rebuilding
            the book toward a fresh optimum — which is why the cost is{" "}
            <span className="num text-fg-2">{inr(rec.transaction_cost)}</span> and not a multiple
            of it.
          </p>
        )}
      </Panel>

      {/* 4 — Validation and decision */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <Panel title="Why the engine decided this" hint="Generated by the explanation service">
          <pre
            className="text-[11.5px] leading-relaxed whitespace-pre-wrap font-sans text-fg-2 m-0"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {rec.explanation || "No explanation was returned for this run."}
          </pre>
        </Panel>

        <Panel title="Decision" hint="Recorded to the audit trail">
          {decided ? (
            <div className="flex flex-col items-start gap-2.5">
              <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                {decided === "approved" ? (
                  <CheckCircle2 size={16} style={{ color: "var(--color-safe)" }} />
                ) : (
                  <X size={16} style={{ color: "var(--color-fg-2)" }} />
                )}
                Recommendation {decided}
              </span>
              <p className="text-[11.5px] text-fg-3 leading-relaxed">
                {decided === "approved"
                  ? "Holdings have been updated and the action is now part of the audit trail."
                  : "The recommendation was declined. The decision and its reasoning are still recorded."}
              </p>
              <Link to="/ledger" className="btn mt-1">
                Open the ledger <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[11.5px] text-fg-2 leading-relaxed mb-4">
                {holds
                  ? "The engine recommends holding. Approving records the assessment without moving capital."
                  : `Approving applies the reallocation to the simulated book at a cost of ${inr(rec.transaction_cost)}.`}
              </p>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => onDecide(true)}
                  disabled={deciding}
                >
                  {deciding ? <Spinner size={13} /> : <CheckCircle2 size={14} />} Approve
                </button>
                <button className="btn flex-1" onClick={() => onDecide(false)} disabled={deciding}>
                  <X size={14} /> Reject
                </button>
              </div>
              <p className="mt-3.5 text-[10.5px] text-fg-3 leading-relaxed">
                Simulation only. No order is ever sent to a venue.
              </p>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ── Small parts ─────────────────────────────────────────────────────── */

function MetricRow({
  label,
  before,
  after,
  fmt,
  goodWhen = "down",
}: {
  label: string;
  before: number;
  after: number;
  fmt: (v: number) => string;
  goodWhen?: "up" | "down";
}) {
  const diff = after - before;
  const flat = Math.abs(diff) < 1e-9;
  const good = goodWhen === "up" ? diff > 0 : diff < 0;
  const color = flat ? "var(--color-fg-3)" : good ? "var(--color-safe)" : "var(--color-crisis)";
  return (
    <tr>
      <td className="text-fg-2">{label}</td>
      <td className="num tnum text-fg-3">{fmt(before)}</td>
      <td className="num tnum font-semibold" style={{ color }}>
        {fmt(after)}
      </td>
      <td className="num tnum" style={{ color }}>
        {flat ? "—" : `${diff > 0 ? "+" : ""}${fmt(diff)}`}
      </td>
    </tr>
  );
}

/** Signed bar around a centre line, so buys and sells read at a glance. */
function DeltaBar({ diff, color }: { diff: number; color: string }) {
  const magnitude = Math.min(Math.abs(diff) / 0.2, 1) * 50;
  return (
    <div className="relative h-3.5 w-[150px]">
      <span
        className="absolute inset-y-0 left-1/2 w-px"
        style={{ background: "var(--color-line)" }}
        aria-hidden
      />
      <span
        className="absolute top-1/2 -translate-y-1/2 h-2 rounded-[2px]"
        style={{
          width: `${magnitude}%`,
          [diff >= 0 ? "left" : "right"]: "50%",
          background: color,
          opacity: Math.abs(diff) < 0.005 ? 0.2 : 0.85,
          transition: "width .5s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </div>
  );
}

function ShockRow({ symbol, name, value }: { symbol: string; name: string; value: number }) {
  const color = CLASS_META[symbol as AssetClass]?.color ?? "var(--color-fg-3)";
  const negative = value < 0;
  const magnitude = Math.min(Math.abs(value) / 0.35, 1) * 50;
  return (
    <div className="flex items-center gap-2.5">
      <Swatch color={color} />
      <span className="text-[11.5px] text-fg-2 flex-1 truncate">{name}</span>
      <div className="relative h-3 w-[62px] shrink-0">
        <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: "var(--color-line)" }} aria-hidden />
        <span
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-[2px]"
          style={{
            width: `${magnitude}%`,
            [negative ? "right" : "left"]: "50%",
            background: negative ? "var(--color-crisis)" : "var(--color-safe)",
            opacity: 0.85,
          }}
        />
      </div>
      <span
        className="num text-[11px] w-12 text-right shrink-0"
        style={{ color: negative ? "var(--color-crisis)" : "var(--color-safe)" }}
      >
        {signedPct(value, 0)}
      </span>
    </div>
  );
}

/** Severity read straight off the shock vector — no invented rating. */
function Severity({ shocks }: { shocks: Scenario["shocks"] }) {
  const worst = Math.min(0, ...shocks.map((s) => s.shock_percentage));
  const level = Math.min(Math.abs(worst) / 0.4, 1);
  return (
    <span className="w-10 shrink-0" title={`Worst asset shock ${signedPct(worst, 0)}`}>
      <Meter
        value={level}
        of={1}
        height={3}
        color={level > 0.6 ? "var(--color-crisis)" : level > 0.25 ? "var(--color-warning)" : "var(--color-safe)"}
      />
    </span>
  );
}

function weightMap(data: { portfolio: { holdings: Array<{ asset: { symbol: string; name: string } | null; weight: number }> } }) {
  const map = new Map<string, { weight: number; name: string; symbol: AssetClass }>();
  data.portfolio.holdings.forEach((h) => {
    if (!h.asset) return;
    map.set(h.asset.symbol.toLowerCase(), {
      weight: h.weight,
      name: h.asset.name,
      symbol: h.asset.symbol as AssetClass,
    });
  });
  return map;
}
