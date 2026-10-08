import { getDataset } from "@/lib/data";
import { monthLabel, pct, signed } from "@/lib/format";
import { attendanceSummary, latestSatisfaction, peopleTotals, uniqSorted } from "@/lib/metrics";
import { Bars, Lines } from "@/components/charts";
import RegionSelect from "@/components/RegionSelect";
import { Chip, Head, Panel, Tile, regionParam } from "@/components/ui";

export default async function People({ searchParams }: { searchParams: { region?: string } }) {
  const { sources: S, tables: T } = await getDataset();
  const moves = T.people_moves, regions = uniqSorted(moves.map(r => r.region));
  const region = regionParam(searchParams, regions);
  const tot = peopleTotals(moves, region);
  const rows = moves.filter(r => region === "all" || r.region === region);
  const trend = uniqSorted(rows.map(r => r.month)).map(m => {
    const r = rows.filter(x => x.month === m);
    return { m: monthLabel(m), joined: r.reduce((a, x) => a + x.hires, 0), left: -r.reduce((a, x) => a + x.exits, 0) };
  });
  const sat = latestSatisfaction(T.satisfaction);
  const satRows = sat.rows.filter(r => region === "all" || r.region === region);
  const branches = uniqSorted(T.attendance.map(r => r.branch));
  const att = T.attendance.length ? attendanceSummary(T.attendance, branches.includes(region) ? region : "all") : null;

  return <>
    <Head title="People" intro="Hiring, exits and customer satisfaction by region."><RegionSelect regions={regions} value={region} /></Head>
    <div className="tiles">
      <Tile label="Joined" value={String(tot.hires)} />
      <Tile label="Left" value={String(tot.exits)} />
      <Tile label="Net change" value={signed(tot.net)}><Chip level={tot.net >= 0 ? "good" : "bad"}>{tot.net >= 0 ? "Growing" : "Shrinking"}</Chip></Tile>
      {att
        ? <Tile label="Attendance" value={pct(att.rate)} sub={`${att.employees} people, ${att.from} to ${att.to}`}><Chip level={att.rate >= 0.9 ? "good" : att.rate >= 0.8 ? "warn" : "bad"}>{att.absent} absences</Chip></Tile>
        : <Tile label="Attendance" value="–"><Chip level="warn">No data yet</Chip></Tile>}
    </div>
    <div className="grid2">
      <Panel title="Joiners and leavers" source={S.people_moves}>
        <Bars stacked money={false} data={trend} x="m" series={[{ key: "joined", label: "Joined", color: "var(--s1)" }, { key: "left", label: "Left", color: "var(--s2)" }]} />
      </Panel>
      <Panel title={`Customer satisfaction ${sat.year}`} source={S.satisfaction}>
        {satRows.length ? <div className="tablebox"><table>
          <thead><tr><th>Region</th><th className="n">Score</th><th className="n">Target</th><th /></tr></thead>
          <tbody>{satRows.map(r => <tr key={r.region}><td>{r.region}</td><td className="n">{pct(r.score, 0)}</td><td className="n">{pct(r.target, 0)}</td><td><Chip level={r.score >= r.target ? "good" : "warn"}>{r.score >= r.target ? "On target" : "Below"}</Chip></td></tr>)}</tbody>
        </table></div> : <div className="empty">No satisfaction survey for this region.</div>}
      </Panel>
      {att ? <>
        <Panel title="Attendance by day" source={S.attendance}>
          <Lines percent data={att.byDate.map(d => ({ d: d.date.slice(5), rate: d.rate }))} x="d" series={[{ key: "rate", label: "Present", color: "var(--s1)" }]} />
        </Panel>
        <Panel title="Lowest attendance">
          <div className="tablebox"><table>
            <thead><tr><th>Name</th><th>Branch</th><th className="n">Present</th><th className="n">Absent</th><th className="n">Leave</th><th className="n">Rate</th></tr></thead>
            <tbody>{att.byEmployee.slice(0, 10).map(e => <tr key={e.id}><td>{e.name}</td><td>{e.branch}</td><td className="n">{e.present}</td><td className="n">{e.absent}</td><td className="n">{e.leave}</td><td className="n"><Chip level={e.rate >= 0.9 ? "good" : e.rate >= 0.8 ? "warn" : "bad"}>{pct(e.rate, 0)}</Chip></td></tr>)}</tbody>
          </table></div>
        </Panel>
      </> : <Panel title="Attendance and performance">
        <div className="empty">
          <strong>Add an attendance register to switch this on.</strong>
          <span>One row per employee per day, from Excel or a Google Sheet, with columns like <code>date</code> <code>employee_id</code> <code>name</code> <code>branch</code> <code>status (P / A / L / H)</code>.</span>
          <span><a className="btn" href="/data/upload">Upload attendance</a> or start from the <a href="/templates/attendance-template.xlsx">template</a>.</span>
        </div>
      </Panel>}
    </div>
  </>;
}
