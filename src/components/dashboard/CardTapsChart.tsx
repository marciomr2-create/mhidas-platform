"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type DailyTapPoint = {
  dayLabel: string; // "17/02"
  taps: number;
};

export default function CardTapsChart({ data }: { data: DailyTapPoint[] }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div
      style={{
        width: "100%",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          Taps por dia
        </h3>
        <span style={{ opacity: 0.7, fontSize: 13 }}>
          {hasData ? `${data.length} dias` : "Sem dados"}
        </span>
      </div>

      <div style={{ marginTop: 12, width: "100%", height: 300 }}>
        {!hasData ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              border: "1px dashed rgba(255,255,255,0.18)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.75,
              fontSize: 14,
            }}
          >
            Nenhum tap no período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dayLabel" tickMargin={8} />
              <YAxis allowDecimals={false} width={40} />
              <Tooltip formatter={(value) => [value, "Taps"]} />
              <Line type="monotone" dataKey="taps" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
