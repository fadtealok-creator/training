import { getDataset } from "@/lib/data";
import { MONTHS, money, pct } from "@/lib/format";
import { salesSummary, topN, uniqSorted } from "@/lib/metrics";
import { Bars, Donut } from "@/components/charts";
import RegionSelect from "@/components/RegionSelect";
import { Head, Panel, Tile, regionParam } from "@/components/ui";

export default async function Sales({ searchParams }: { searchParams: { region?: string } }) {
  const { sources: S, tables: T } = await getDataset();
  const regions = uniqSorted(T.sales_lines.map(r => r.region));
  const region = regionParam(searchParams, regions);
  const s = salesSummary(T.sales_lines, region);
  const year = T.sales_lines[0]?.date.slice(0, 4) ?? "";
  const byMonth = MONTHS.map((m, i) => ({ m, revenue: s.byMonth.get(`${year}-${String(i + 1).padStart(2, "0")}`) ?? 0 }));
  const cats = topN(s.byCategory, 99);
  const catRows = [...cats.slice(0, 6).map(([c, v]) => ({ c, revenue: v })), ...(cats.length > 6 ? [{ c: "Other", revenue: cats.slice(6).reduce((a, x) => a + x[1], 0) }] : [])];
  const sp = topN(s.bySalesperson, 8), maxSp = sp[0]?.[1] ?? 1;

  return <>
    <Head title="Sales" intro={`Order lines for ${year}. Pick a region to see one branch.`}><RegionSelect regions={regions} value={region} /></Head>
    <div className="tiles">
      <Tile label="Revenue" value={money(s.revenue)} />
      <Tile label="Orders" value={String(s.orders)} sub={`${money(s.avgOrder)} average`} />
      <Tile label="Units sold" value={s.units.toLocaleString("en-IN")} />
      <Tile label="Gross margin" value={pct(s.margin)} />
    </div>
    <div className="grid2">
      <Panel title="Revenue by month" source={S.sales_lines}><Bars data={byMonth} x="m" series={[{ key: "revenue", label: "Revenue", color: "var(--s1)" }]} /></Panel>
      <Panel title="By category"><Bars horizontal data={catRows} x="c" series={[{ key: "revenue", label: "Revenue", color: "var(--s2)" }]} /></Panel>
      <Panel title="Top salespeople">
        <div className="tablebox"><table>
          <thead><tr><th>Name</th><th className="n">Units</th><th className="n">Revenue</th><th /></tr></thead>
          <tbody>{sp.map(([n, v]) => <tr key={n}><td>{n}</td><td className="n">{s.unitsBySalesperson.get(n)}</td><td className="n">{money(v)}</td><td><div className="bar"><b style={{ width: `${(v / maxSp) * 100}%` }} /></div></td></tr>)}</tbody>
        </table></div>
      </Panel>
      <Panel title="Top customers">
        <div className="tablebox"><table>
          <thead><tr><th>Customer</th><th className="n">Revenue</th><th className="n">Share</th></tr></thead>
          <tbody>{topN(s.byCustomer, 8).map(([n, v]) => <tr key={n}><td>{n}</td><td className="n">{money(v)}</td><td className="n">{pct(v / s.revenue)}</td></tr>)}</tbody>
        </table></div>
      </Panel>
      <Panel title="How customers pay"><Donut data={Array.from(s.byPayment, ([name, value]) => ({ name, value }))} colors={["var(--s1)", "var(--s2)", "var(--s3)"]} /></Panel>
    </div>
  </>;
}
