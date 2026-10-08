import { getDataset } from "@/lib/data";
import { money, monthLabel, pct, signedPct } from "@/lib/format";
import { pnlSeries, pnlTotal, uniqSorted } from "@/lib/metrics";
import { Lines } from "@/components/charts";
import RegionSelect from "@/components/RegionSelect";
import { Chip, Head, Panel, Tile, regionParam } from "@/components/ui";

function VsPlan({ actual, plan, higherIsGood = true }: { actual: number; plan: number; higherIsGood?: boolean }) {
  const d = actual / plan - 1, ok = higherIsGood ? d >= 0 : d <= 0;
  return <Chip level={ok ? "good" : "bad"}>{signedPct(d)} vs plan</Chip>;
}

export default async function Finance({ searchParams }: { searchParams: { region?: string } }) {
  const { sources: S, tables: T } = await getDataset();
  const p = T.pnl_monthly, regions = uniqSorted(p.map(r => r.region));
  const region = regionParam(searchParams, regions);
  const t = (m: "revenue" | "expense" | "ebit", s: "actual" | "plan") => pnlTotal(p, m, s, region);
  const actual = pnlSeries(p, "revenue", "actual", region), plan = pnlSeries(p, "revenue", "plan", region);
  const trend = actual.map((a, i) => ({ m: monthLabel(a.month), actual: a.amount, plan: plan[i]?.amount ?? 0 }));
  const year = actual[0]?.month.slice(0, 4) ?? "";

  return <>
    <Head title="Finance" intro={`Actual against plan for ${year}, month by month.`}><RegionSelect regions={regions} value={region} /></Head>
    <div className="tiles">
      <Tile label="Revenue" value={money(t("revenue", "actual"))}><VsPlan actual={t("revenue", "actual")} plan={t("revenue", "plan")} /></Tile>
      <Tile label="Expenses" value={money(t("expense", "actual"))}><VsPlan actual={t("expense", "actual")} plan={t("expense", "plan")} higherIsGood={false} /></Tile>
      <Tile label="EBIT" value={money(t("ebit", "actual"))}><VsPlan actual={t("ebit", "actual")} plan={t("ebit", "plan")} /></Tile>
      <Tile label="EBIT margin" value={pct(t("ebit", "actual") / t("revenue", "actual"))} sub={`Plan ${pct(t("ebit", "plan") / t("revenue", "plan"))}`} />
    </div>
    <div className="grid2">
      <Panel title="Revenue: actual and plan" source={S.pnl_monthly}>
        <Lines data={trend} x="m" series={[{ key: "actual", label: "Actual", color: "var(--s1)" }, { key: "plan", label: "Plan", color: "var(--s2)", dashed: true }]} />
      </Panel>
      <Panel title="By region">
        <div className="tablebox"><table>
          <thead><tr><th>Region</th><th className="n">Revenue</th><th className="n">vs plan</th><th className="n">EBIT</th></tr></thead>
          <tbody>{regions.map(g => {
            const a = pnlTotal(p, "revenue", "actual", g), pl = pnlTotal(p, "revenue", "plan", g);
            return <tr key={g}><td>{g}</td><td className="n">{money(a)}</td><td className="n"><Chip level={a >= pl ? "good" : "bad"}>{signedPct(a / pl - 1)}</Chip></td><td className="n">{money(pnlTotal(p, "ebit", "actual", g))}</td></tr>;
          })}</tbody>
        </table></div>
      </Panel>
    </div>
  </>;
}
