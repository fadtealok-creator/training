import { getDataset } from "@/lib/data";
import { money, pct, signed, signedPct } from "@/lib/format";
import { agingBuckets, buildAlerts, latestMonth, overdueShare, peopleTotals, pnlTotal, salesSummary } from "@/lib/metrics";
import { Chip, Head, Source, Tile } from "@/components/ui";

export default async function Today() {
  const d = await getDataset();
  const { sources: S, tables: T } = d;
  const s = salesSummary(T.sales_lines);
  const month = latestMonth(T.receivables_aging);
  const ar = agingBuckets(T.receivables_aging, month), arTotal = ar.reduce((a, b) => a + b, 0), over90 = overdueShare(ar);
  const ebitA = pnlTotal(T.pnl_monthly, "ebit", "actual"), ebitP = pnlTotal(T.pnl_monthly, "ebit", "plan");
  const revA = pnlTotal(T.pnl_monthly, "revenue", "actual"), revP = pnlTotal(T.pnl_monthly, "revenue", "plan");
  const ppl = peopleTotals(T.people_moves);
  const alerts = buildAlerts(d, money, v => pct(v));

  return <>
    <Head title="Here is what needs you today" intro="One view across sales, collections, finance and people." />
    <div className="tiles">
      <Tile label="Sales" value={money(s.revenue)} sub={`${s.orders} orders`}><Source info={S.sales_lines} /></Tile>
      <Tile label="Gross margin" value={pct(s.margin)} sub={`${money(s.revenue - s.cost)} after product cost`}><Source info={S.sales_lines} /></Tile>
      <Tile label="Receivables" value={money(arTotal)}><Chip level={over90 > 0.08 ? "bad" : "warn"}>{pct(over90)} over 90 days</Chip><Source info={S.receivables_aging} /></Tile>
      <Tile label="EBIT" value={money(ebitA)}><Chip level={ebitA >= ebitP ? "good" : "bad"}>{signedPct(ebitA / ebitP - 1, 0)} vs plan</Chip><Source info={S.pnl_monthly} /></Tile>
      <Tile label="Revenue vs plan" value={pct(revA / revP)} sub={`${money(revA)} of ${money(revP)}`}><Source info={S.pnl_monthly} /></Tile>
      <Tile label="Headcount change" value={signed(ppl.net)} sub={`${ppl.hires} joined, ${ppl.exits} left`}><Source info={S.people_moves} /></Tile>
    </div>
    <div className="sechead"><h2>Needs attention</h2></div>
    <div className="alerts">
      {alerts.map(a => (
        <a key={a.title} className={`alert ${a.level}`} href={a.href}>
          <span className="st" />
          <div><p>{a.title}</p><small>{a.detail}</small></div>
          <span className="go">Open</span>
        </a>
      ))}
    </div>
    <div className="note">Sample data: the sample files describe different businesses and years, so sales (2023) and the other sections (2022) don&apos;t share a calendar or regions. A customer&apos;s own data would.</div>
  </>;
}
