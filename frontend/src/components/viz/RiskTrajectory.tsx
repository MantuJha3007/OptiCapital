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
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
          {/* Regime bands as the backdrop, so the line is read against the
              envelope rather than against an arbitrary axis. */}
          {REGIMES.map((key) => (
            <ReferenceArea
              key={key}
              y1={BANDS[key].from}
              y2={BANDS[key].to}
              fill={BANDS[key].color}
              fillOpacity={0.05}
              stroke="none"
            />
          ))}

          <CartesianGrid stroke="var(--color-line-soft)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="index"
            tick={{ fill: "var(--color-fg-3)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-line-soft)" }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 30, 60, 80, 100]}
            tick={{ fill: "var(--color-fg-3)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={46}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-line)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point;
              return (
                <div className="panel px-3 py-2 text-[11.5px]">
                  <div className="font-semibold mb-1">{p.action}</div>
                  <div className="num text-fg-2">
                    {p.before.toFixed(1)} <span className="text-fg-3">→</span>{" "}
                    <span style={{ color: p.after < p.before ? "var(--color-safe)" : "var(--color-fg)" }}>
                      {p.after.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-fg-3 mt-1">
                    {p.when} · {p.approved ? "approved" : "declined"}
                  </div>
                </div>
              );
            }}
          />

          <Line
            type="monotone"
            dataKey="before"
            name="Assessed"
            stroke="var(--color-fg-3)"
            strokeWidth={1.4}
            strokeDasharray="4 4"
            dot={{ r: 2.5, fill: "var(--color-fg-3)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="after"
            name="After recommendation"
            stroke="var(--regime)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--regime)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
