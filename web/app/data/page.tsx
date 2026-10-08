import Link from "next/link";
import { getDataset } from "@/lib/data";
import { listImports } from "@/lib/store";
import type { TableName } from "@/lib/types";
import { Chip, Head } from "@/components/ui";
import { deleteImport } from "./upload/actions";

const LABELS: Record<TableName, string> = {
  sales_lines: "Sales order lines", pnl_monthly: "Profit and loss by month", receivables_aging: "Receivables ageing",
  people_moves: "Joiners and leavers", satisfaction: "Customer satisfaction", attendance: "Attendance",
};
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function Data() {
  const { sources } = await getDataset();
  const imports = await listImports();
  const imported = new Set(imports.map(i => i.table));
  const byFile = new Map<string, { table: TableName; sheet: string; rows: number; warnings: string[] }[]>();
  (Object.keys(sources) as TableName[]).filter(t => !imported.has(t) && sources[t].rows > 0).forEach(table => {
    const { label, rows, warnings } = sources[table];
    const [file, sheet = ""] = label.split(" › ");
    byFile.set(file, [...(byFile.get(file) ?? []), { table, sheet, rows, warnings }]);
  });

  return <>
    <Head title="Connected data" intro="Every number in the app comes from one of these sources. Each is read into the same shared tables, so adding Tally or Google Sheets doesn't change the screens.">
      <Link className="btn" href="/data/upload">Upload a sheet</Link>
    </Head>
    <div className="srcs">
      {imports.map(i => (
        <div className="source-card" key={i.id}>
          <h3>{i.file}</h3>
          <Chip level={i.warnings.length ? "warn" : "good"}>Your upload · {when(i.importedAt)}</Chip>
          <ul><li>{LABELS[i.table]}: {i.rows.length.toLocaleString("en-IN")} rows from sheet “{i.sheet}”{i.warnings.map(w => <div key={w}>⚠ {w}</div>)}</li></ul>
          <form action={deleteImport}><input type="hidden" name="id" value={i.id} /><button className="btn ghost" type="submit">Remove and go back to sample data</button></form>
        </div>
      ))}
      {Array.from(byFile, ([file, items]) => (
        <div className="source-card" key={file}>
          <h3>{file}</h3>
          <Chip level={items.some(i => i.warnings.length) ? "warn" : "good"}>Sample data · {items.some(i => i.warnings.length) ? "read with warnings" : "read"}</Chip>
          <ul>{items.map(i => <li key={i.table}>{LABELS[i.table]}: {i.rows} rows from sheet “{i.sheet}”{i.warnings.map(w => <div key={w}>⚠ {w.replace(`${i.table}: `, "")}</div>)}</li>)}</ul>
        </div>
      ))}
      <div className="source-card off"><h3>Tally</h3><Chip level="warn">Planned</Chip><ul><li>Until then: export Day Book or Sales Register to Excel and upload it here</li><li>Later: a small connector on the Tally PC that syncs nightly</li></ul></div>
      <div className="source-card off"><h3>Google Sheets</h3><Chip level="warn">Planned</Chip><ul><li>Until then: File › Download › Microsoft Excel, then upload it here</li><li>Later: sign in with Google once, pick the sheet, it refreshes on a schedule</li></ul></div>
    </div>
  </>;
}
