"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/format";

const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false };
const tip = { contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)" }, formatter: (v: number) => money(v) };
const legend = { wrapperStyle: { fontSize: 12, color: "var(--muted)" } };

export type Series = { key: string; label: string; color: string; dashed?: boolean };
type Row = Record<string, string | number>;

export function Bars({ data, x, series, stacked, horizontal, money: isMoney = true }: { data: Row[]; x: string; series: Series[]; stacked?: boolean; horizontal?: boolean; money?: boolean }) {
  const fmt = isMoney ? money : (v: number) => String(Math.abs(v));
  return (
    <div className="chartbox">
      <ResponsiveContainer>
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 8, left: horizontal ? 24 : 0, bottom: 0 }} stackOffset={stacked ? "sign" : undefined}>
          <CartesianGrid stroke="var(--line)" vertical={!!horizontal} horizontal={!horizontal} />
          {horizontal ? <>
            <XAxis type="number" {...axis} tickFormatter={fmt} />
            <YAxis type="category" dataKey={x} {...axis} width={110} />
          </> : <>
            <XAxis dataKey={x} {...axis} />
            <YAxis {...axis} tickFormatter={fmt} width={64} />
          </>}
          <Tooltip {...tip} formatter={(v: number) => fmt(v)} cursor={{ fill: "var(--sunk)" }} />
          {series.length > 1 && <Legend {...legend} />}
          {series.map(s => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={stacked ? "a" : undefined} radius={stacked ? 0 : 3} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Lines({ data, x, series, percent }: { data: Row[]; x: string; series: Series[]; percent?: boolean }) {
  const fmt = percent ? (v: number) => `${Math.round(v * 100)}%` : money;
  return (
    <div className="chartbox">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey={x} {...axis} />
          <YAxis {...axis} tickFormatter={fmt} width={64} domain={percent ? [0, 1] : undefined} />
          <Tooltip {...tip} formatter={(v: number) => fmt(v)} />
          {series.length > 1 && <Legend {...legend} />}
          {series.map(s => <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) {
  return (
    <div className="chartbox">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" stroke="var(--surface)" strokeWidth={2}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip {...tip} />
          <Legend {...legend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
