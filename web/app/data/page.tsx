import { getDataset } from "@/lib/data";
import type { TableName } from "@/lib/types";
import { Chip, Head } from "@/components/ui";

const LABELS: Record<TableName, string> = {
  sales_lines: "Sales order lines", pnl_monthly: "Profit and loss by month", receivables_aging: "Receivables ageing",
  people_moves: "Joiners and leavers", satisfaction: "Customer satisfaction",
};

export default async function Data() {
  const { sources } = await getDataset();
  const byFile = new Map<string, { table: TableName; sheet: string; rows: number; warnings: string[] }[]>();
  (Object.keys(sources) as TableName[]).forEach(table => {
    const { label, rows, warnings } = sources[table];
    const [file, sheet = ""] = label.split(" › ");
    byFile.set(file, [...(byFile.get(file) ?? []), { table, sheet, rows, warnings }]);
  });

  return <>
    <Head title="Connected data" intro="Every number in the app comes from one of these sources. Each is read into the same shared tables, so adding Tally or Google Sheets doesn't change the screens." />
    <div className="srcs">
      {Array.from(byFile, ([file, items]) => (
        <div className="source-card" key={file}>
          <h3>{file}</h3>
          <Chip level={items.some(i => i.warnings.length) ? "warn" : "good"}>Excel upload · {items.some(i => i.warnings.length) ? "read with warnings" : "read"}</Chip>
          <ul>{items.map(i => <li key={i.table}>{LABELS[i.table]}: {i.rows} rows from sheet “{i.sheet}”{i.warnings.map(w => <div key={w}>⚠ {w.replace(`${i.table}: `, "")}</div>)}</li>)}</ul>
        </div>
      ))}
      <div className="source-card off"><h3>Tally</h3><Chip level="warn">Planned</Chip><ul><li>Sales and purchase vouchers, ledgers, outstanding bills</li><li>Upload of standard exports first, then a small connector on the Tally PC</li></ul></div>
      <div className="source-card off"><h3>Google Sheets</h3><Chip level="warn">Planned</Chip><ul><li>Attendance registers, targets, any team sheet</li><li>Sign in with Google once, pick the sheet, it refreshes on a schedule</li></ul></div>
    </div>
  </>;
}
