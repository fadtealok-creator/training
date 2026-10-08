import { BUCKETS, type AgingRow, type Dataset, type PeopleRow, type PnlRow, type SalesLine, type SatisfactionRow } from "./types";

export const ALL = "all";
const inRegion = (region: string) => (r: { region: string }) => region === ALL || r.region === region;

export const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
export function groupSum<T>(rows: T[], key: (r: T) => string, val: (r: T) => number): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + val(r));
  return m;
}
export const uniqSorted = (xs: string[]) => Array.from(new Set(xs)).sort();
export const topN = (m: Map<string, number>, n: number) => Array.from(m).sort((a, b) => b[1] - a[1]).slice(0, n);

/* Sales */
export function salesSummary(lines: SalesLine[], region = ALL) {
  const rows = lines.filter(inRegion(region));
  const revenue = sum(rows, r => r.revenue), cost = sum(rows, r => r.cost);
  const orders = new Set(rows.map(r => r.order_id)).size;
  return {
    rows, revenue, cost, orders, units: sum(rows, r => r.qty),
    margin: revenue ? (revenue - cost) / revenue : 0,
    avgOrder: orders ? revenue / orders : 0,
    byMonth: groupSum(rows, r => r.date.slice(0, 7), r => r.revenue),
    byCategory: groupSum(rows, r => r.category, r => r.revenue),
    byCustomer: groupSum(rows, r => r.customer, r => r.revenue),
    bySalesperson: groupSum(rows, r => r.salesperson, r => r.revenue),
    unitsBySalesperson: groupSum(rows, r => r.salesperson, r => r.qty),
    byPayment: groupSum(rows, r => r.payment, r => r.revenue),
  };
}

/* Finance */
export function pnlSeries(rows: PnlRow[], metric: PnlRow["metric"], scenario: PnlRow["scenario"], region = ALL) {
  const m = groupSum(rows.filter(r => r.metric === metric && r.scenario === scenario).filter(inRegion(region)), r => r.month, r => r.amount);
  return uniqSorted(Array.from(m.keys())).map(month => ({ month, amount: m.get(month)! }));
}
export const pnlTotal = (rows: PnlRow[], metric: PnlRow["metric"], scenario: PnlRow["scenario"], region = ALL) =>
  sum(pnlSeries(rows, metric, scenario, region), r => r.amount);

/* Collections */
export const latestMonth = (rows: { month: string }[]) => uniqSorted(rows.map(r => r.month)).pop() ?? "";
export function agingBuckets(rows: AgingRow[], month: string, region = ALL): number[] {
  const m = groupSum(rows.filter(r => r.month === month).filter(inRegion(region)), r => r.bucket, r => r.amount);
  return BUCKETS.map(b => m.get(b) ?? 0);
}
export function overdueShare(buckets: number[]) {
  const total = buckets.reduce((a, b) => a + b, 0);
  return total ? buckets[3] / total : 0;
}

/* People */
export function peopleTotals(rows: PeopleRow[], region = ALL) {
  const r = rows.filter(inRegion(region));
  const hires = sum(r, x => x.hires), exits = sum(r, x => x.exits);
  return { hires, exits, net: hires - exits };
}
export function latestSatisfaction(rows: SatisfactionRow[]) {
  const year = Math.max(...rows.map(r => r.year));
  return { year, rows: rows.filter(r => r.year === year) };
}

/* Today: things that need the owner's attention, most urgent first. */
export type Alert = { level: "bad" | "warn" | "good"; title: string; detail: string; href: string };
export function buildAlerts(d: Dataset, fmt: (n: number) => string, pctFmt: (n: number) => string): Alert[] {
  const { pnl_monthly: pnl, receivables_aging: aging, people_moves: moves, satisfaction: sat, sales_lines: sales } = d.tables;
  const out: Alert[] = [];
  const regions = uniqSorted(pnl.map(r => r.region));

  const under = regions
    .map(g => [g, pnlTotal(pnl, "revenue", "actual", g) / pnlTotal(pnl, "revenue", "plan", g) - 1] as const)
    .filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  if (under.length) out.push({ level: "bad", href: "/finance",
    title: `Revenue is below plan in ${under.length} of ${regions.length} regions`,
    detail: "Worst: " + under.slice(0, 3).map(([g, v]) => `${g} ${pctFmt(v)}`).join(", ") });

  const month = latestMonth(aging);
  const agingRegions = uniqSorted(aging.map(r => r.region));
  const worst = agingRegions.map(g => ({ g, b: agingBuckets(aging, month, g) })).sort((a, b) => overdueShare(b.b) - overdueShare(a.b))[0];
  if (worst) out.push({ level: overdueShare(worst.b) > 0.08 ? "bad" : "warn", href: "/collections",
    title: `${worst.g} has ${pctFmt(overdueShare(worst.b))} of receivables past 90 days`,
    detail: `${fmt(worst.b[3])} to chase as of ${month}` });

  const churn = uniqSorted(moves.map(r => r.region)).map(g => ({ g, ...peopleTotals(moves, g) })).sort((a, b) => a.net - b.net)[0];
  if (churn) out.push({ level: churn.net < 0 ? "bad" : "warn", href: "/people",
    title: `${churn.g} has the weakest hiring balance`, detail: `Net ${churn.net >= 0 ? "+" : ""}${churn.net} people over the year` });

  if (sat.length) {
    const { year, rows } = latestSatisfaction(sat);
    const miss = rows.filter(r => r.score < r.target);
    if (miss.length) out.push({ level: "warn", href: "/people",
      title: `Customer satisfaction is under target in ${miss.length} regions`, detail: `${year}: ${miss.map(r => r.region).join(", ")}` });
  }

  const s = salesSummary(sales);
  const [top] = topN(s.byCustomer, 1);
  if (top) out.push({ level: "good", href: "/sales", title: `${top[0]} is your largest customer`, detail: `${pctFmt(top[1] / s.revenue)} of sales` });

  const rank = { bad: 0, warn: 1, good: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}
