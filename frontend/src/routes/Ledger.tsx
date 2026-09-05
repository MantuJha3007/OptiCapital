/* Autonomous Execution Ledger.

   A table of rows would record what happened. Trust needs the reasoning
   attached, so each entry expands into the chain the engine actually
   followed — trigger, condition, decision, recommendation, validation,
   outcome — reconstructed from the stored explanation rather than narrated
   after the fact. Every field on screen comes from the audit tables in
   PostgreSQL; nothing here is generated for display. */

import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronDown, Clock, X } from "lucide-react";
import { useReadySystem } from "../store/system";
import { Empty, Metric, Panel, RegimePill, Rule, Spinner } from "../components/ui/primitives";
import { parseExplanation } from "../lib/explanation";
import { asRegime } from "../lib/regime";
import { inr, pct, relativeTime, timestamp } from "../lib/format";
import type { RebalanceRecord } from "../types";

/* Recharts is only needed for this one chart, on this one route, and only
   once enough decisions exist to plot. Loading it on demand keeps it out of
   the initial bundle entirely. */
const RiskTrajectory = lazy(() =>
  import("../components/viz/RiskTrajectory").then((m) => ({ default: m.RiskTrajectory })),
);

type Filter = "all" | "approved" | "rejected" | "hold" | "intervention";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "intervention", label: "Interventions" },
  { key: "hold", label: "Holds" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Declined" },
];

export default function Ledger() {
  const { data, refreshing } = useReadySystem();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [collapsedFirst, setCollapsedFirst] = useState(false);

  const records = useMemo(() => {
    return data.history.filter((r) => {
      switch (filter) {
        case "approved":
          return r.approved;
        case "rejected":
          return !r.approved;
        case "hold":
          return r.action === "HOLD";
        case "intervention":
          return r.action !== "HOLD";
        default:
          return true;
      }
    });
  }, [data.history, filter]);

  const stats = useMemo(() => {
    const all = data.history;
    const interventions = all.filter((r) => r.action !== "HOLD");
    const approved = all.filter((r) => r.approved);
    const cost = approved.reduce((a, r) => a + (r.transaction_cost ?? 0), 0);
    const improved = all.filter(
      (r) => r.risk_before != null && r.risk_after != null && r.risk_after < r.risk_before,
    );
    const avgReduction = improved.length
      ? improved.reduce((a, r) => a + (r.risk_before! - r.risk_after!), 0) / improved.length
      : 0;
    return { total: all.length, interventions: interventions.length, approved: approved.length, cost, avgReduction };
  }, [data.history]);

  if (data.history.length === 0) {
    return (
      <Panel bodyClass="p-0" className="rise">
        <Empty
          title="The ledger is empty"
          body="No decision has been recorded yet. Every assessment, recommendation and approval is written to PostgreSQL as an auditable event — run a scenario to put the first one through."
          action={
            <Link to="/stress" className="btn btn-primary">
              Open the Stress Studio <ArrowRight size={13} />
            </Link>
          }
        />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4 rise">
      {/* ── Summary ───────────────────────────────────────────────────── */}
      <section className="panel p-5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
          <Metric label="Decisions recorded" value={String(stats.total)} />
          <Metric
            label="Interventions"
            value={String(stats.interventions)}
            sub={`${stats.total - stats.interventions} assessed as hold`}
          />
          <Metric label="Approved" value={String(stats.approved)} sub="Applied to holdings" />
          <Metric label="Cost incurred" value={inr(stats.cost)} sub="Across approved actions" />
          <Metric
            label="Avg risk reduction"
            value={stats.avgReduction ? `${stats.avgReduction.toFixed(1)} pts` : "—"}
            tone={stats.avgReduction ? "regime" : "muted"}
            sub="Where the score improved"
          />
        </div>
        <p className="mt-5 pt-4 border-t hair text-[11.5px] text-fg-3 leading-relaxed max-w-[96ch]">
          Holds are recorded with the same weight as interventions. A system that only logs the
          times it acted cannot show that it declined to act — and restraint is the behaviour this
          product is arguing for.
        </p>
      </section>

      {/* ── Trajectory ────────────────────────────────────────────────── */}
      {data.history.filter((r) => r.risk_before != null && r.risk_after != null).length >= 2 && (
        <Panel
          title="Risk across the decision history"
          hint="Assessed score against the score the recommendation would achieve"
        >
          <Suspense
            fallback={
              <div className="h-[220px] flex items-center justify-center">
                <Spinner size={16} />
              </div>
            }
          >
            <RiskTrajectory history={data.history} />
          </Suspense>
          <p className="mt-3 text-[11px] text-fg-3 leading-relaxed max-w-[96ch]">
            Dashed line is the risk the engine assessed; solid line is where its recommendation
            would place the book. The gap between them is the value the control loop is offering
            at each decision point.
          </p>
        </Panel>
      )}

      {/* ── Timeline ──────────────────────────────────────────────────── */}
      <Panel
        title="Decision history"
        hint={`${records.length} of ${data.history.length} shown`}
        actions={
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {refreshing && <Spinner size={11} />}
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="rounded px-2 py-1 text-[11px] font-medium transition-colors"
                style={
                  filter === f.key
                    ? { background: "rgb(var(--regime-rgb) / 0.14)", color: "var(--regime)" }
                    : { color: "var(--color-fg-3)" }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {records.length === 0 ? (
          <Empty title="Nothing matches this filter" body="Try a different view of the history." />
        ) : (
          <ol className="flex flex-col">
            {records.map((r, i) => {
              // The most recent decision is expanded by default, until the
              // reader closes it or opens a different one.
              const isOpen = open ? open === r.id : i === 0 && !collapsedFirst;
              return (
                <Entry
                  key={r.id}
                  record={r}
                  last={i === records.length - 1}
                  open={isOpen}
                  onToggle={() => {
                    if (isOpen) {
                      setOpen(null);
                      if (i === 0) setCollapsedFirst(true);
                    } else {
                      setOpen(r.id);
                      setCollapsedFirst(true);
                    }
                  }}
                />
              );
            })}
          </ol>
        )}
      </Panel>

      {/* ── Solver activity ───────────────────────────────────────────── */}
      {data.optimizations.length > 0 && (
        <Panel
          title="Optimiser runs"
          hint="Every solve, whether or not it produced an action"
          bodyClass="p-0"
        >
          <div className="overflow-x-auto">
            <table className="grid min-w-[680px]">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Regime</th>
                  <th>Status</th>
                  <th className="tnum">Volatility</th>
                  <th className="tnum">Expected return</th>
                  <th className="tnum">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.optimizations.map((o) => (
                  <tr key={o.id}>
                    <td className="num text-[11.5px] text-fg-2">{timestamp(o.created_at)}</td>
                    <td>
                      <RegimePill regime={asRegime(o.risk_level)} size="sm" />
                    </td>
                    <td>
                      <span
                        className="text-[11px] font-medium"
                        style={{
                          color: o.status === "OPTIMAL" ? "var(--color-safe)" : "var(--color-warning)",
                        }}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="num tnum text-fg-2">
                      {o.volatility_before != null && o.volatility_after != null ? (
                        <>
                          {pct(o.volatility_before)}
                          <span className="text-fg-3"> → </span>
                          <span className="text-fg">{pct(o.volatility_after)}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="num tnum text-fg-2">
                      {o.expected_return_before != null && o.expected_return_after != null ? (
                        <>
                          {pct(o.expected_return_before)}
                          <span className="text-fg-3"> → </span>
                          <span className="text-fg">{pct(o.expected_return_after)}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="num tnum text-fg-3">
                      {o.transaction_cost != null ? inr(o.transaction_cost) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */

function Entry({
  record: r,
  last,
  open,
  onToggle,
}: {
  record: RebalanceRecord;
  last: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const parsed = useMemo(() => parseExplanation(r.reason), [r.reason]);
  const intervention = r.action !== "HOLD";
  const regime = asRegime(parsed.level);
  const delta =
    r.risk_before != null && r.risk_after != null ? r.risk_after - r.risk_before : null;

  const steps = [
    {
      label: "Trigger",
      body: intervention
        ? "Risk assessment breached the safe operating envelope."
        : "Scheduled risk assessment of the current book.",
    },
    {
      label: "Risk condition",
      body: parsed.breaches.length
        ? null
        : parsed.level
          ? `Portfolio assessed at ${parsed.level}${parsed.score != null ? ` (${parsed.score.toFixed(1)}/100)` : ""} with no threshold breached.`
          : "No condition detail was recorded.",
      list: parsed.breaches,
    },
    {
      label: "Decision",
      body: intervention
        ? `${r.action.replace(/_/g, " ")} — apply the smallest reallocation that restores the envelope.`
        : "HOLD — no intervention is justified; avoid unnecessary turnover.",
    },
    {
      label: "Recommendation",
      body:
        parsed.reduced.length || parsed.increased.length
          ? null
          : "No position changes were proposed.",
      list: [...parsed.reduced.map((s) => `↓ ${s}`), ...parsed.increased.map((s) => `↑ ${s}`)],
    },
    {
      label: "Validation",
      body:
        parsed.closing ??
        (delta != null
          ? `Recommended allocation moves the risk score by ${delta.toFixed(1)} points.`
          : "No validation detail was recorded."),
    },
    {
      label: "Outcome",
      body: r.approved
        ? `Approved. Holdings updated at a transaction cost of ${inr(r.transaction_cost ?? 0)}.`
        : "Declined. Holdings were left unchanged and the decision was recorded.",
    },
  ];

  return (
    <li className="relative pl-7">
      {/* Rail */}
      {!last && (
        <span
          className="absolute left-[7px] top-6 bottom-0 w-px"
          style={{ background: "var(--color-line-soft)" }}
          aria-hidden
        />
      )}
      <span
        className="absolute left-0 top-[15px] w-3.5 h-3.5 rounded-full border-2"
        style={{
          background: "var(--color-ink-850)",
          borderColor: intervention ? "var(--regime)" : "var(--color-line)",
        }}
        aria-hidden
      />

      <div className={`py-3 ${last ? "" : "border-b hair"}`}>
        <button
          className="w-full flex items-center gap-3 text-left group"
          onClick={onToggle}
          aria-expanded={open}
        >
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-2.5 flex-wrap">
              <span
                className="text-[12.5px] font-semibold"
                style={{ color: intervention ? "var(--regime)" : "var(--color-fg)" }}
              >
                {r.action.replace(/_/g, " ")}
              </span>
              {parsed.level && <RegimePill regime={regime} size="sm" />}
              <span
                className="inline-flex items-center gap-1 text-[10.5px]"
                style={{ color: r.approved ? "var(--color-safe)" : "var(--color-fg-3)" }}
              >
                {r.approved ? <CheckCircle2 size={11} /> : <X size={11} />}
                {r.approved ? "Approved" : "Declined"}
              </span>
            </span>
            <span className="flex items-center gap-3 mt-1 text-[11px] text-fg-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock size={10} />
                <span className="num">{timestamp(r.created_at)}</span>
                <span>· {relativeTime(r.created_at)}</span>
              </span>
              {delta != null && (
                <span className="num">
                  risk {r.risk_before!.toFixed(1)}
                  <span className="text-fg-3"> → </span>
                  <span style={{ color: delta < 0 ? "var(--color-safe)" : "var(--color-fg-2)" }}>
                    {r.risk_after!.toFixed(1)}
                  </span>
                </span>
              )}
              {r.transaction_cost != null && r.transaction_cost > 0 && (
                <span className="num">cost {inr(r.transaction_cost)}</span>
              )}
              {parsed.breaches.length > 0 && (
                <span>
                  {parsed.breaches.length} breach{parsed.breaches.length > 1 ? "es" : ""}
                </span>
              )}
            </span>
          </span>
          <ChevronDown
            size={15}
            className="shrink-0 text-fg-3 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          />
        </button>

        {open && (
          <div className="mt-4 pt-4 border-t hair">
            <Rule>Decision chain</Rule>
            <ol className="flex flex-col gap-3.5 mt-3">
              {steps.map((s, i) => (
                <li key={s.label} className="flex gap-3">
                  <span
                    className="num shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold"
                    style={{ background: "var(--color-ink-800)", color: "var(--color-fg-3)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="label mb-1">{s.label}</div>
                    {s.body && (
                      <p className="text-[12px] text-fg-2 leading-relaxed">{s.body}</p>
                    )}
                    {s.list && s.list.length > 0 && (
                      <ul className="flex flex-col gap-1 mt-0.5">
                        {s.list.map((item, k) => (
                          <li
                            key={k}
                            className="text-[12px] text-fg-2 leading-relaxed pl-2.5 border-l"
                            style={{ borderColor: "var(--color-line)" }}
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {parsed.raw && (
              <details className="mt-4">
                <summary className="text-[11px] text-fg-3 cursor-pointer hover:text-fg-2 select-none">
                  Original engine explanation
                </summary>
                <pre
                  className="mt-2 p-3 rounded text-[11px] leading-relaxed whitespace-pre-wrap text-fg-3 overflow-x-auto"
                  style={{ background: "var(--color-ink-900)", fontFamily: "var(--font-mono)" }}
                >
                  {parsed.raw}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
