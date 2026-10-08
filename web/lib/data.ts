import "server-only";
import sample from "@/data/sample-data.json";
import { listImports } from "./store";
import type { Dataset, TableName } from "./types";

/**
 * The one place screens get data from: the bundled sample, with any table the
 * owner has uploaded replacing the sample version. The next step swaps this
 * for a Supabase query scoped to the signed-in user's business, same shape.
 */
export async function getDataset(): Promise<Dataset> {
  const base = sample as unknown as Omit<Dataset, "tables" | "sources"> & { tables: Partial<Dataset["tables"]>; sources: Partial<Dataset["sources"]> };
  const tables = { attendance: [], ...base.tables } as Dataset["tables"];
  const sources = { attendance: { label: "Not connected", rows: 0, warnings: [] }, ...base.sources } as Dataset["sources"];
  for (const imp of await listImports()) {
    (tables as Record<TableName, unknown[]>)[imp.table] = imp.rows;
    sources[imp.table] = { label: `${imp.file} › ${imp.sheet}`, rows: imp.rows.length, warnings: imp.warnings, importedAt: imp.importedAt };
  }
  return { tables, sources };
}
