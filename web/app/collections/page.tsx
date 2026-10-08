import { getDataset } from "@/lib/data";
import { money, monthLabel, pct } from "@/lib/format";
import { agingBuckets, latestMonth, overdueShare, uniqSorted } from "@/lib/metrics";
import { BUCKETS } from "@/lib/types";
import { Bars } from "@/components/charts";
import RegionSelect from "@/components/RegionSelect";
import { Chip, Head, Panel, Tile, regionParam } from "@/components/ui";

const level = (share: number) => (share > 0.08 ? "bad" : share > 0.06 ? "warn" : "good");

export default async function Collections({ searchParams }: { searchParams: { region?: string } }) {
  const { sources: S, tables: T } = await getDataset();
  const rows = T.receivables_aging, regions = uniqSorted(rows.map(r => r.region));
  const region = regionParam(searchParams, regions);
  const month = latestMonth(rows), b = agingBuckets(rows, month, region), total = b.reduce((x, y) => x + y, 0);
  const trend = uniqSorted(rows.map(r => r.month)).map(m => {
    const v = agingBuckets(rows, m, region);
    return { m: monthLabel(m), ...Object.fromEntries(BUCKETS.map((k, i) => [k, v[i]])) };
  });
  const byRegion = regions.map(g => ({ g, b: agingBuckets(rows, month, g) })).sort((x, y) => overdueShare(y.b) - overdueShare(x.b));
  const colors = ["var(--s3)", "var(--s1)", "var(--s2)", "var(--bad)"];

  return <>
    <Head title="Collections" intro={`Money customers owe you, by how long it has been outstanding. Latest month: ${month}.`}><RegionSelect regions={regions} value={region} /></Head>
    <div className="tiles">
      <Tile label="Outstanding" value={money(total)} />
      {BUCKETS.map((k, i) => <Tile key={k} label={`${k} days`} value={money(b[i])}><Chip level={i === 3 ? "bad" : i === 2 ? "warn" : "good"}>{pct(total ? b[i] / total : 0)}</Chip></Tile>)}
    </div>
    <div className="grid2">
      <Panel title="Ageing over the year" source={S.receivables_aging}>
        <Bars stacked data={trend} x="m" series={BUCKETS.map((k, i) => ({ key: k, label: `${k} days`, color: colors[i] }))} />
      </Panel>
      <Panel title="Regions to chase first">
        <div className="tablebox"><table>
          <thead><tr><th>Region</th><th className="n">Outstanding</th><th className="n">90+ days</th><th className="n">Share 90+</th></tr></thead>
          <tbody>{byRegion.map(({ g, b: x }) => { const sh = overdueShare(x); return <tr key={g}><td>{g}</td><td className="n">{money(x.reduce((p, q) => p + q, 0))}</td><td className="n">{money(x[3])}</td><td className="n"><Chip level={level(sh)}>{pct(sh)}</Chip></td></tr>; })}</tbody>
        </table></div>
      </Panel>
    </div>
  </>;
}
