/* Executive Overview — the command view.

   Deliberately not a grid of KPI cards. The first thing on screen is a
   verdict, because the product philosophy is that most of the time the
   correct action is no action, and a system that says so plainly is more
   trustworthy than one that always has a recommendation. Everything below
   the verdict exists to justify it: where the score comes from, how much
   room is left against each control limit, and what the book actually holds. */

import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useReadySystem } from "../store/system";
import { Metric, Meter, Panel, RegimePill, Rule, Swatch } from "../components/ui/primitives";
import { EnvelopeBand } from "../components/viz/EnvelopeBand";
import { AllocationStrip } from "../components/viz/Attribution";
import { CLASS_META, clusterName, type AssetClass } from "../lib/exposure";
import { BANDS, CONSTRAINTS, CONSTRAINT_LABELS, decomposeScore, detectBreaches } from "../lib/regime";
import { inr, pct, relativeTime } from "../lib/format";

export default function Overview() {
  const { data, exposure, regime, lastRun } = useReadySystem();
  const m = data.risk.metrics;

  const breaches = detectBreaches(m);
  const components = decomposeScore(m).sort((a, b) => b.points - a.points);
  const limits = CONSTRAINTS[regime];

  const weightOf = (symbol: AssetClass) =>
    data.portfolio.holdings.find((h) => h.asset?.symbol === symbol)?.weight ?? 0;

  const segments = data.portfolio.holdings
    .filter((h) => h.asset)
    .map((h) => ({
      key: h.asset!.symbol,
      label: h.asset!.name,
      weight: h.weight,
      color: CLASS_META[h.asset!.symbol as AssetClass]?.color ?? "var(--color-fg-3)",
    }))
    .sort((a, b) => b.weight - a.weight);

  // The control engine's live limits vs where the portfolio actually sits.
  const utilisation = [
    { key: "max_equity" as const, actual: weightOf("EQUITY"), limit: limits.max_equity, kind: "ceiling" as const },
    { key: "min_cash" as const, actual: weightOf("CASH"), limit: limits.min_cash, kind: "floor" as const },
    { key: "max_volatility" as const, actual: m.volatility, limit: limits.max_volatility, kind: "ceiling" as const },
    { key: "max_drawdown" as const, actual: m.max_drawdown, limit: limits.max_drawdown, kind: "ceiling" as const },
  ];

  const outOfBounds = utilisation.filter((u) =>
    u.kind === "ceiling" ? u.actual > u.limit : u.actual < u.limit,
  );

  const pending = lastRun && lastRun.recommendation.action !== "HOLD" ? lastRun : null;
  const topCluster = exposure.clusters.find((c) => c.crossClass) ?? exposure.clusters[0] ?? null;
  const hottest = [...exposure.sleeves].sort((a, b) => b.intensity - a.intensity)[0];
  const recent = data.history.slice(0, 3);

  return (
    <div className="flex flex-col gap-4 rise">
      {/* ── Verdict ───────────────────────────────────────────────────── */}
      <section
        className="panel p-5 lg:p-6"
        style={{
          borderColor:
            breaches.length || pending ? "rgb(var(--regime-rgb) / 0.45)" : "var(--color-line-soft)",
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-8">
          <div className="lg:w-[38%] shrink-0">
            <div className="flex items-center gap-2.5 mb-3">
              {breaches.length || pending ? (
                <AlertTriangle size={17} style={{ color: "var(--regime)" }} />
              ) : (
                <CheckCircle2 size={17} style={{ color: "var(--color-safe)" }} />
              )}
              <RegimePill regime={regime} />
            </div>

            <h2 className="text-[22px] lg:text-[26px] font-semibold tracking-tight leading-[1.15]">
              {pending
                ? "Intervention recommended"
                : breaches.length
                  ? `${breaches.length} control ${breaches.length === 1 ? "limit" : "limits"} breached`
                  : "No intervention required"}
            </h2>

            <p className="mt-2.5 text-[12.5px] text-fg-2 leading-relaxed max-w-[46ch]">
              {pending ? (
                <>
                  The <span className="text-fg">{pending.scenario.name}</span> run put the book
                  outside its envelope. A minimum-intervention reallocation is waiting for a
                  decision at a turnover of{" "}
                  <span className="num text-fg">{pct(pending.recommendation.turnover)}</span>.
                </>
              ) : breaches.length ? (
                <>The portfolio has left the safe operating envelope on the limits listed below.</>
              ) : (
                <>
                  The portfolio is inside its safe operating envelope on every breach trigger.
                  Holding the current allocation avoids{" "}
                  <span className="text-fg">unnecessary turnover and transaction cost</span>.
                </>
              )}
            </p>

            {!breaches.length && outOfBounds.length > 0 && (
              <p className="mt-2.5 text-[11.5px] text-fg-3 leading-relaxed max-w-[46ch]">
                {outOfBounds.map((u) => CONSTRAINT_LABELS[u.key]).join(" and ")} sits outside the{" "}
                {BANDS[regime].label} optimiser bound. That does not itself trigger an intervention
                — it is a target the next reallocation would move toward.
              </p>
            )}

            {pending && (
              <Link to="/stress" className="btn btn-primary mt-4">
                Review the recommendation <ArrowRight size={13} />
              </Link>
            )}

            {!pending && !breaches.length && (
              <Link to="/stress" className="btn mt-4">
                Test what would break it <ArrowRight size={13} />
              </Link>
            )}

            {breaches.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5">
                {breaches.map((b) => (
                  <li
                    key={b.key}
                    className="text-[11.5px] text-fg-2 pl-3 border-l"
                    style={{ borderColor: "var(--regime)" }}
                  >
                    {b.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <Rule>Safe operating envelope</Rule>
            <div className="mt-3">
              <EnvelopeBand
                score={m.risk_score}
                projected={lastRun ? lastRun.after_shock.risk_score : null}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t hair">
              <Metric label="Capital" value={inr(data.portfolio.total_capital)} size="sm" />
              <Metric label="Expected return" value={pct(m.expected_return)} size="sm" />
              <Metric label="Volatility" value={pct(m.volatility)} size="sm" />
              <Metric label="Liquidity ratio" value={pct(m.liquidity_ratio)} size="sm" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Drivers + control limits ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel
          title="What is driving the score"
          hint={`${m.risk_score.toFixed(1)} of 100, by weighted component`}
        >
          <div className="flex flex-col gap-3">
            {components.map((c) => (
              <div key={c.key}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="text-[12px] text-fg-2">
                    {c.label}
                    <span className="num text-[10px] text-fg-3 ml-1.5">
                      w {c.weight.toFixed(2)}
                    </span>
                  </span>
                  <span className="num text-[12px] shrink-0">
                    <span className="font-semibold">{c.points.toFixed(1)}</span>
                    <span className="text-fg-3"> pts</span>
                  </span>
                </div>
                <Meter
                  value={c.points}
                  of={Math.max(...components.map((x) => x.weight * 100))}
                  color={
                    c.normalised > 66
                      ? "var(--color-crisis)"
                      : c.normalised > 33
                        ? "var(--color-warning)"
                        : "var(--color-safe)"
                  }
                  height={5}
                />
                <div className="flex justify-between mt-1 text-[10px] text-fg-3">
                  <span className="num">
                    {c.key === "concentration"
                      ? c.display.toFixed(3)
                      : c.key === "stress"
                        ? c.display.toFixed(2)
                        : pct(c.display)}
                  </span>
                  <span>{c.basis}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-fg-3 leading-relaxed">
            The largest bar is where a reduction moves the score most. Component weights and
            normalisation match the engine exactly.
          </p>
        </Panel>

        <Panel
          title="Optimiser bounds in force"
          hint={`${BANDS[regime].label} set · applied when a reallocation is solved`}
          actions={<RegimePill regime={regime} size="sm" />}
        >
          <div className="flex flex-col gap-3.5">
            {utilisation.map((u) => {
              const ok = u.kind === "ceiling" ? u.actual <= u.limit : u.actual >= u.limit;
              // Headroom as a fraction of the limit, in the safe direction.
              const room =
                u.kind === "ceiling"
                  ? (u.limit - u.actual) / (u.limit || 1)
                  : (u.actual - u.limit) / (u.limit || 1);
              const span = Math.max(u.limit, u.actual) * 1.25;
              return (
                <div key={u.key}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-[12px] text-fg-2">{CONSTRAINT_LABELS[u.key]}</span>
                    <span className="num text-[12px] shrink-0">
                      <span
                        className="font-semibold"
                        style={{ color: ok ? "var(--color-fg)" : "var(--color-warning)" }}
                      >
                        {pct(u.actual)}
                      </span>
                      <span className="text-fg-3">
                        {" "}
                        / {u.kind === "ceiling" ? "max" : "min"} {pct(u.limit, 0)}
                      </span>
                    </span>
                  </div>
                  <div className="relative">
                    <Meter
                      value={u.actual}
                      of={span}
                      height={7}
                      color={ok ? "var(--regime)" : "var(--color-warning)"}
                    />
                    <span
                      className="absolute top-[-2px] bottom-[-2px] w-px"
                      style={{
                        left: `${(u.limit / span) * 100}%`,
                        background: "var(--color-fg-2)",
                      }}
                      title={`Limit ${pct(u.limit, 0)}`}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-fg-3">
                    {!ok ? (
                      <span style={{ color: "var(--color-warning)" }}>
                        Outside bound — the next reallocation would correct this
                      </span>
                    ) : room < 0.005 ? (
                      <span style={{ color: "var(--color-warning)" }}>Exactly at the bound</span>
                    ) : (
                      <>
                        <span className="num">{(room * 100).toFixed(0)}%</span> headroom against the
                        bound
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] text-fg-3 leading-relaxed">
            These are the bounds handed to the optimiser, and they tighten automatically as the
            regime escalates — at CRISIS the equity ceiling falls to 20% and the cash floor rises
            to 20%. Breaches of volatility, drawdown, liquidity or concentration are what actually
            trigger an intervention.
          </p>
        </Panel>
      </div>

      {/* ── Book + connected exposure ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4">
        <Panel title="Capital allocation" hint={`${segments.length} asset classes`}>
          <AllocationStrip segments={segments} />

          <div className="mt-5 pt-4 border-t hair">
            <Rule>Concentration check</Rule>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Metric
                label="Reported HHI"
                value={m.concentration.toFixed(3)}
                size="sm"
                sub="Treats every class as independent"
              />
              {topCluster && (
                <Metric
                  label="Largest correlated block"
                  value={pct(topCluster.weight)}
                  size="sm"
                  tone={topCluster.weight > 0.35 ? "regime" : "default"}
                  sub={`${clusterName(topCluster, exposure.byId)} · avg ρ ${topCluster.avgRho.toFixed(2)}`}
                />
              )}
            </div>
            {topCluster && topCluster.crossClass && (
              <p className="mt-3 text-[11.5px] text-fg-2 leading-relaxed">
                {pct(topCluster.weight)} of capital sits in sleeves that move together across
                asset-class boundaries. HHI cannot see this, because it counts positions rather
                than behaviour.{" "}
                <Link to="/contagion" className="text-[var(--regime)] hover:underline">
                  Open the network →
                </Link>
              </p>
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Sharpest risk concentration" hint="Risk per unit of capital">
            {hottest && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Swatch color={CLASS_META[hottest.cls].color} />
                  <span className="text-[13px] font-medium">{hottest.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Capital" value={pct(hottest.weight)} size="sm" />
                  <Metric label="Risk" value={pct(hottest.riskShare)} size="sm" />
                  <Metric
                    label="Intensity"
                    value={`${hottest.intensity.toFixed(2)}x`}
                    size="sm"
                    tone={hottest.intensity > 1.15 ? "regime" : "default"}
                  />
                </div>
                <p className="mt-3 text-[11.5px] text-fg-3 leading-relaxed">
                  Carries {pct(hottest.riskShare)} of portfolio risk on {pct(hottest.weight)} of
                  capital.{" "}
                  <Link to="/risk" className="text-[var(--regime)] hover:underline">
                    Full attribution →
                  </Link>
                </p>
              </div>
            )}
          </Panel>

          <Panel
            title="Recent decisions"
            hint={recent.length ? undefined : "Nothing recorded yet"}
            actions={
              recent.length > 0 ? (
                <Link to="/ledger" className="text-[11px] text-fg-3 hover:text-fg">
                  All →
                </Link>
              ) : undefined
            }
          >
            {recent.length === 0 ? (
              <p className="text-[11.5px] text-fg-3 leading-relaxed">
                No decisions have been recorded. Run a scenario in the Stress Studio to put the
                control loop through a full cycle.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] text-fg-2 truncate">
                      {r.action.replace(/_/g, " ")}
                    </span>
                    <span className="num text-[10.5px] text-fg-3 shrink-0">
                      {relativeTime(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
