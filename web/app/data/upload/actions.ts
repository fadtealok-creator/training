"use server";
import { revalidatePath } from "next/cache";
import { applyMapping, guessMapping, guessTable, tableDef } from "@/lib/mapping";
import { readWorkbook, type Sheet } from "@/lib/sheets";
import { removeImport, saveImport } from "@/lib/store";
import type { TableName } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;

export type SheetSummary = { name: string; headers: string[]; sample: Record<string, unknown>[]; rowCount: number; table: TableName; mapping: Record<string, string | null> };
export type Checked = { ok: boolean; total: number; preview: Record<string, unknown>[]; warnings: string[]; errors: string[]; saved?: boolean };

async function load(form: FormData): Promise<{ file: File; sheets: Sheet[] }> {
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Choose a file to upload.");
  if (file.size > MAX_BYTES) throw new Error("The file is larger than 10 MB. Split it by month and upload each part.");
  return { file, sheets: await readWorkbook(await file.arrayBuffer(), file.name) };
}

const fail = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong reading the file.");

/** Step 1: read the file and suggest, for each sheet, which table it is and which column is which. */
export async function analyzeFile(form: FormData): Promise<{ sheets?: SheetSummary[]; error?: string }> {
  try {
    const { sheets } = await load(form);
    if (!sheets.length) return { error: "No sheet with a header row was found in this file." };
    return {
      sheets: sheets.map(s => {
        const def = guessTable(s.headers);
        return { name: s.name, headers: s.headers, sample: s.rows.slice(0, 3), rowCount: s.rows.length, table: def.table, mapping: guessMapping(def, s.headers) };
      }),
    };
  } catch (e) {
    return { error: fail(e) };
  }
}

/** Step 2 and 3: check the chosen mapping, and save it when `save` is set. */
export async function checkImport(form: FormData): Promise<Checked> {
  try {
    const { file, sheets } = await load(form);
    const sheet = sheets.find(s => s.name === form.get("sheet"));
    const def = tableDef(form.get("table") as TableName);
    if (!sheet || !def) return { ok: false, total: 0, preview: [], warnings: [], errors: ["Pick a sheet and what it contains."] };
    const mapping = JSON.parse(String(form.get("mapping") ?? "{}")) as Record<string, string | null>;
    for (const k of Object.keys(mapping)) if (mapping[k] && !sheet.headers.includes(mapping[k]!)) mapping[k] = null;
    const res = applyMapping(def, mapping, sheet.rows, sheet.headerRow + 1);
    const ok = res.errors.length === 0;
    let saved = false;
    if (ok && form.get("save") === "1") {
      await saveImport({ table: def.table, file: file.name, sheet: sheet.name, rows: res.rows, warnings: res.warnings });
      revalidatePath("/", "layout");
      saved = true;
    }
    return { ok, total: res.rows.length, preview: res.rows.slice(0, 5), warnings: res.warnings, errors: res.errors, saved };
  } catch (e) {
    return { ok: false, total: 0, preview: [], warnings: [], errors: [fail(e)] };
  }
}

export async function deleteImport(form: FormData) {
  await removeImport(String(form.get("id")));
  revalidatePath("/", "layout");
}
