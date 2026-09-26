"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fmtValue = (v: unknown, currency: string) => {
  const n = typeof v === "number" ? v : Number(v) || 0;
  return currency === "USD" ? `$${n.toFixed(2)}` : String(n);
};

export interface TrendPoint {
  label: string;
  value: number;
}

export function TrendChart({
  data,
  color = "#4f46e5",
  currency = "USD",
  height = 240,
}: {
  data: TrendPoint[];
  color?: string;
  currency?: string;
  height?: number;
}) {
  const id = `grad-${color.replace("#", "")}`;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            width={52}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              currency === "USD" ? `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}` : `${v}`
            }
          />
          <Tooltip
            formatter={(value) => fmtValue(value, currency)}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface BarPoint {
  label: string;
  value: number;
}

export function BarChart({
  data,
  color = "#4f46e5",
  currency = "USD",
  height = 240,
}: {
  data: BarPoint[];
  color?: string;
  currency?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RechartsBar data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            width={52}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (currency === "USD" ? `$${v}` : `${v}`)}
          />
          <Tooltip
            formatter={(value) => fmtValue(value, currency)}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
            cursor={{ fill: "rgba(99,102,241,0.06)" }}
          />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </RechartsBar>
      </ResponsiveContainer>
    </div>
  );
}
