/* Risk score across the recorded decision history.

   The only genuine time series this system holds: rebalance_actions stores
   risk_before and risk_after with a timestamp for every decision. Plotted in
   order it answers a question no single snapshot can — whether the control
   loop is actually pulling risk down over time, and by how much each
   intervention moved it.

   Recharts is used here rather than hand-rolled SVG because this is a
   conventional two-series time chart with hover inspection, which is exactly
   what a charting library is for. */

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BANDS, REGIMES } from "../../lib/regime";
import type { RebalanceRecord } from "../../types";

interface Point {
  index: number;
  when: string;
  before: number;
  after: number;
  approved: boolean;
  action: string;
}

export function RiskTrajectory({ history }: { history: RebalanceRecord[] }) {
  // Oldest first, and only entries that actually carry a score pair.
  const points: Point[] = [...history]
    .reverse()
    .filter((r) => r.risk_before != null && r.risk_after != null)
    .map((r, i) => ({
      index: i + 1,
      when: new Date(r.created_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      before: r.risk_before!,
      after: r.risk_after!,
      approved: r.approved,
      action: r.action.replace(/_/g, " "),
    }));

  if (points.length < 2) return null;

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: -10 }}>
          {/* Regime bands as the backdrop, so the line is read against the
              envelope rather than against an arbitrary axis. */}
          {REGIMES.map((key) => (
            <ReferenceArea
              key={key}
              y1={BANDS[key].from}
              y2={BANDS[key].to}
              fill={BANDS[key].color}
              fillOpacity={0.06}
              stroke="none"
            />
          ))}

          <CartesianGrid stroke="rgba(51, 65, 85, 0.4)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="index"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(51, 65, 85, 0.5)" }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 30, 60, 80, 100]}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "rgba(148, 163, 184, 0.3)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point;
              return (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs shadow-xl">
                  <div className="font-bold text-slate-100 mb-1">{p.action}</div>
                  <div className="font-mono text-slate-300">
                    {p.before.toFixed(1)} <span className="text-slate-500">→</span>{" "}
                    <span style={{ color: p.after < p.before ? "#10b981" : "#f87171" }} className="font-bold">
                      {p.after.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-slate-400 mt-1 text-[11px]">
                    {p.when} · <span className={p.approved ? "text-emerald-400 font-medium" : "text-slate-500"}>{p.approved ? "approved" : "recorded"}</span>
                  </div>
                </div>
              );
            }}
          />

          <Line
            type="monotone"
            dataKey="before"
            name="Assessed"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={{ r: 3, fill: "#94a3b8", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="after"
            name="After recommendation"
            stroke="#38bdf8"
            strokeWidth={2.2}
            dot={{ r: 3.5, fill: "#38bdf8", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
