import "server-only";
import ExcelJS from "exceljs";

export type Sheet = { name: string; headers: string[]; rows: Record<string, unknown>[]; headerRow: number };

const MAX_ROWS = 50000;

/** Read every sheet of an .xlsx or .csv file into header-keyed rows. */
export async function readWorkbook(data: ArrayBuffer, filename: string): Promise<Sheet[]> {
  if (/\.csv$/i.test(filename)) return [fromGrid("Sheet1", parseCsv(new TextDecoder().decode(data)))];
  if (!/\.xlsx$/i.test(filename)) throw new Error("Upload an .xlsx or .csv file. For an old .xls file, open it in Excel and save as .xlsx.");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data);
  } catch {
    throw new Error("This file couldn't be read as an Excel workbook. Open it in Excel, save as .xlsx and try again.");
  }
  const out: Sheet[] = [];
  wb.eachSheet(ws => {
    if (ws.state && ws.state !== "visible") return;
    const grid: unknown[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      if (n > MAX_ROWS) return;
      const vals = (row.values as unknown[]).slice(1).map(cell);
      grid[n - 1] = vals;
    });
    const s = fromGrid(ws.name, Array.from(grid, r => r ?? []));
    if (s.headers.length) out.push(s);
  });
  return out;
}

/** Plain value from an exceljs cell: formulas give their result, rich text gives its text. */
function cell(v: unknown): unknown {
  if (v == null || v instanceof Date || typeof v !== "object") return v ?? null;
  const o = v as Record<string, unknown>;
  if ("result" in o) return cell(o.result);
  if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map(t => t.text).join("");
  if ("text" in o) return o.text;
  if ("error" in o) return null;
  return null;
}

/**
 * The header is the row (within the first 15) with the most text cells, which skips the
 * company name and report title lines that Tally and many registers put on top.
 */
export function fromGrid(name: string, grid: unknown[][]): Sheet {
  let headerRow = 0, best = 0;
  grid.slice(0, 15).forEach((r, i) => {
    const n = r.filter(v => typeof v === "string" && v.trim() !== "").length;
    if (n > best) { best = n; headerRow = i; }
  });
  if (best < 2) return { name, headers: [], rows: [], headerRow: 0 };
  const raw = grid[headerRow].map((h, i) => (h == null || String(h).trim() === "" ? `Column ${i + 1}` : String(h).trim()));
  const headers = raw.map((h, i) => (raw.indexOf(h) === i ? h : `${h} (${i + 1})`));
  const rows = grid.slice(headerRow + 1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null])));
  while (rows.length && Object.values(rows[rows.length - 1]).every(v => v == null || v === "")) rows.pop();
  return { name, headers, rows, headerRow: headerRow + 1 };
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.map(r => r.map((v, i) => (i === 0 ? v.replace(/^﻿/, "") : v)));
}
