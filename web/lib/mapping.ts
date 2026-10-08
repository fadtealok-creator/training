import type { TableName } from "./types";

/**
 * What each shared table needs from an uploaded sheet, and the column names
 * people commonly use for it (including Tally and Indian accounting terms).
 * Used to guess a mapping that the owner then confirms on the upload screen.
 */
export type FieldKind = "text" | "number" | "date" | "month" | "year" | "time" | "status";
export type FieldDef = { key: string; label: string; kind: FieldKind; required: boolean; aliases: string[] };
export type TableDef = { table: TableName; label: string; description: string; fields: FieldDef[]; keys: string[] };

const f = (key: string, label: string, kind: FieldKind, required: boolean, aliases: string[]): FieldDef => ({ key, label, kind, required, aliases });

export const TABLE_DEFS: TableDef[] = [
  {
    table: "sales_lines", label: "Sales", description: "One row per invoice or order line", keys: ["order_id"],
    fields: [
      f("date", "Date", "date", true, ["order date", "invoice date", "voucher date", "bill date", "date"]),
      f("order_id", "Invoice / order no.", "text", true, ["order id", "invoice no", "invoice number", "voucher no", "bill no", "order no", "order number"]),
      f("customer", "Customer", "text", true, ["customer name", "party name", "party", "customer", "buyer", "client"]),
      f("region", "Branch / region", "text", false, ["state", "branch", "region", "location", "city", "godown"]),
      f("salesperson", "Salesperson", "text", false, ["salesperson", "sales person", "sales executive", "employee", "agent"]),
      f("product", "Product", "text", false, ["product name", "item name", "stock item", "item", "product", "particulars"]),
      f("category", "Category", "text", false, ["category", "stock group", "item group", "product group"]),
      f("payment", "Payment mode", "text", false, ["payment type", "payment mode", "mode of payment", "payment"]),
      f("qty", "Quantity", "number", true, ["quantity", "qty", "units", "billed qty"]),
      f("revenue", "Amount", "number", true, ["revenue", "amount", "sales amount", "net amount", "taxable value", "value", "total"]),
      f("cost", "Cost", "number", false, ["cost", "total cost", "purchase cost", "cogs"]),
      f("ship_fee", "Shipping", "number", false, ["shipping fee", "freight", "shipping", "delivery charges"]),
    ],
  },
  {
    table: "attendance", label: "Attendance", description: "One row per employee per day", keys: ["date", "employee_id"],
    fields: [
      f("date", "Date", "date", true, ["date", "attendance date", "day"]),
      f("employee_id", "Employee ID", "text", true, ["employee id", "emp id", "employee code", "emp code", "emp no", "staff id"]),
      f("name", "Name", "text", true, ["employee name", "name", "staff name"]),
      f("branch", "Branch", "text", false, ["branch", "location", "department", "site", "office"]),
      f("status", "Status (P/A/L/H)", "status", true, ["status", "attendance", "present/absent", "p/a"]),
      f("in_time", "In time", "time", false, ["in time", "check in", "in", "punch in", "entry time"]),
      f("out_time", "Out time", "time", false, ["out time", "check out", "out", "punch out", "exit time"]),
    ],
  },
  {
    table: "receivables_aging", label: "Receivables ageing", description: "Outstanding amounts by age bucket", keys: ["month", "region", "bucket"],
    fields: [
      f("month", "Month", "month", true, ["month", "as on", "date", "period"]),
      f("region", "Branch / region", "text", true, ["state", "branch", "region", "location", "party"]),
      f("b0_30", "0-30 days", "number", true, ["0-30", "0 - 30", "0-30 days", "< 30 days", "current"]),
      f("b31_60", "31-60 days", "number", true, ["31-60", "31 - 60", "31-60 days"]),
      f("b61_90", "61-90 days", "number", true, ["61-90", "61 - 90", "61-90 days"]),
      f("b90", "Over 90 days", "number", true, ["90+", "> 90", "above 90", "over 90", "90+ days", "more than 90"]),
    ],
  },
  {
    table: "people_moves", label: "Joiners and leavers", description: "Hires and exits per month", keys: ["month", "region"],
    fields: [
      f("month", "Month", "month", true, ["month", "period", "date"]),
      f("region", "Branch / region", "text", true, ["state", "branch", "region", "location", "department"]),
      f("hires", "Joined", "number", true, ["new hires", "hires", "joined", "joiners", "joinees"]),
      f("exits", "Left", "number", true, ["terminations", "termination", "exits", "left", "leavers", "attrition", "resigned"]),
    ],
  },
];

export const tableDef = (t: TableName) => TABLE_DEFS.find(d => d.table === t);

export const norm = (s: string) => s.toLowerCase().replace(/[_./]+/g, " ").replace(/\s+/g, " ").trim();

/** Header → field guesses for one table. Exact alias match beats a contained one; each header is used once. */
export function guessMapping(def: TableDef, headers: string[]): Record<string, string | null> {
  const used = new Set<string>();
  const out: Record<string, string | null> = {};
  const nh = headers.map(h => ({ h, n: norm(h) }));
  for (const pass of ["exact", "contains"] as const) {
    for (const fd of def.fields) {
      if (out[fd.key]) continue;
      const hit = fd.aliases.map(norm).flatMap(a => nh.filter(x => !used.has(x.h) && (pass === "exact" ? x.n === a : a.length > 2 && x.n.includes(a))))[0];
      if (hit) { out[fd.key] = hit.h; used.add(hit.h); }
    }
  }
  for (const fd of def.fields) out[fd.key] ??= null;
  return out;
}

/** Share of required fields a sheet's headers can fill: used to suggest which table a sheet is. */
export function tableScore(def: TableDef, headers: string[]) {
  const m = guessMapping(def, headers);
  const req = def.fields.filter(x => x.required);
  return req.filter(x => m[x.key]).length / req.length;
}

export function guessTable(headers: string[]): TableDef {
  return TABLE_DEFS.map(d => ({ d, s: tableScore(d, headers) })).sort((a, b) => b.s - a.s)[0].d;
}

/* ---- value conversion ---- */

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Dates as Indian sheets write them: Excel dates, 31/01/2024, 31-01-2024, 2024-01-31, 31-Jan-2024. Day comes first. */
export function toDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(+v)) return iso(v);
  if (typeof v === "number" && v > 20000 && v < 80000) return iso(new Date(EXCEL_EPOCH + Math.round(v) * 86400000));
  if (typeof v !== "string") return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return check(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) return check(year(+m[3]), +m[2], +m[1]);
  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s,-]+(\d{2,4})$/);
  if (m && MON.includes(m[2].toLowerCase())) return check(year(+m[3]), MON.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  return null;
}
const year = (y: number) => (y < 100 ? 2000 + y : y);
function check(y: number, mo: number, d: number) {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? iso(dt) : null;
}

export function toMonth(v: unknown): string | null {
  if (typeof v === "string") {
    const s = v.trim();
    let m = s.match(/^(\d{4})-(\d{1,2})$/);
    if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${pad(+m[2])}`;
    m = s.match(/^([A-Za-z]{3})[A-Za-z]*[\s'-]+(\d{2,4})$/);
    if (m && MON.includes(m[1].toLowerCase())) return `${year(+m[2])}-${pad(MON.indexOf(m[1].toLowerCase()) + 1)}`;
  }
  return toDate(v)?.slice(0, 7) ?? null;
}

/** Numbers with Indian grouping, currency signs and accounting negatives: "₹1,25,000.50", "(500)", "1.2 Dr". */
export function toNumber(v: unknown): number | null {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/\s*cr$/i.test(s)) { neg = true; s = s.replace(/\s*cr$/i, ""); }
  s = s.replace(/\s*dr$/i, "").replace(/(₹|rs\.?|inr)/gi, "").replace(/[,\s]/g, "");
  if (!/^-?\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return neg ? -Math.abs(n) : n;
}

export function toTime(v: unknown): string | null {
  if (v instanceof Date) return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
  if (typeof v === "number" && v >= 0 && v < 1) { const mins = Math.round(v * 1440); return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`; }
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = +m[1];
  if (m[3]) h = (h % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0);
  return h < 24 && +m[2] < 60 ? `${pad(h)}:${m[2]}` : null;
}

export function toStatus(v: unknown): "P" | "A" | "L" | "H" | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (["p", "present", "1", "yes", "y", "wfh"].includes(s)) return "P";
  if (["a", "absent", "0", "no", "n"].includes(s)) return "A";
  if (["l", "leave", "cl", "sl", "el", "pl", "on leave", "half day", "hd"].includes(s)) return "L";
  if (["h", "holiday", "wo", "week off", "weekly off", "off"].includes(s)) return "H";
  return null;
}

const CONVERT: Record<FieldKind, (v: unknown) => unknown> = {
  text: v => (v == null || String(v).trim() === "" ? null : String(v).trim()),
  number: toNumber, date: toDate, month: toMonth, time: toTime, status: toStatus,
  year: v => { const n = toNumber(v); return n && n > 1900 && n < 2200 ? Math.round(n) : null; },
};

export type MappedResult = { rows: Record<string, unknown>[]; errors: string[]; warnings: string[]; skipped: number };

/**
 * Turn raw sheet rows into shared-table rows using a confirmed mapping.
 * Rows missing a required value are skipped and reported (first few by sheet row number).
 */
export function applyMapping(def: TableDef, mapping: Record<string, string | null>, raw: Record<string, unknown>[], firstRow = 2): MappedResult {
  const errors: string[] = [], warnings: string[] = [];
  const missing = def.fields.filter(x => x.required && !mapping[x.key]);
  if (missing.length) return { rows: [], skipped: raw.length, warnings, errors: [`Choose a column for: ${missing.map(x => x.label).join(", ")}`] };

  const out: Record<string, unknown>[] = [];
  const problems: string[] = [];
  raw.forEach((r, i) => {
    if (Object.values(r).every(v => v == null || String(v).trim() === "")) return;
    const row: Record<string, unknown> = {};
    const bad: string[] = [];
    for (const fd of def.fields) {
      const col = mapping[fd.key];
      const v = col ? CONVERT[fd.kind](r[col]) : null;
      if (v == null && fd.required) bad.push(fd.label);
      row[fd.key] = v;
    }
    if (bad.length) problems.push(`row ${i + firstRow}: ${bad.join(", ")}`);
    else out.push(row);
  });
  if (problems.length) warnings.push(`${problems.length} rows skipped because a required value was empty or unreadable (${problems.slice(0, 3).join("; ")}${problems.length > 3 ? "; …" : ""})`);

  let rows = finish(def, out);
  const seen = new Set<string>(), dup: string[] = [];
  rows = rows.filter(r => { const k = def.keys.map(x => r[x]).join("|"); if (seen.has(k)) { dup.push(k); return false; } seen.add(k); return true; });
  if (dup.length) warnings.push(`${dup.length} duplicate rows ignored (same ${def.keys.join(" + ")}), e.g. ${dup.slice(0, 2).join(", ")}`);
  if (!rows.length && !errors.length) errors.push("No usable rows found with this mapping.");
  return { rows, errors, warnings, skipped: problems.length };
}

/** Table-specific defaults and reshaping into the exact shared-table row shape. */
function finish(def: TableDef, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  switch (def.table) {
    case "sales_lines":
      return rows.map(r => ({ ...r, region: r.region ?? "Main", salesperson: r.salesperson ?? "Unassigned", product: r.product ?? "Unspecified", category: r.category ?? "Uncategorised", payment: r.payment ?? "Unspecified", cost: r.cost ?? 0, ship_fee: r.ship_fee ?? 0 }));
    case "attendance":
      return rows.map(r => ({ ...r, branch: r.branch ?? "Main" }));
    case "people_moves":
      return rows.map(r => ({ ...r, hires: Math.abs(r.hires as number), exits: Math.abs(r.exits as number) }));
    case "receivables_aging":
      return rows.flatMap(r => ([["0-30", "b0_30"], ["31-60", "b31_60"], ["61-90", "b61_90"], ["90+", "b90"]] as const)
        .map(([bucket, k]) => ({ month: r.month, region: r.region, bucket, amount: r[k] })));
    default:
      return rows;
  }
}
