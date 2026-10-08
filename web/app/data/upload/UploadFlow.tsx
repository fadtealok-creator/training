"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { TABLE_DEFS, guessMapping, tableDef } from "@/lib/mapping";
import type { TableName } from "@/lib/types";
import { analyzeFile, checkImport, type Checked, type SheetSummary } from "./actions";

const SCREEN: Partial<Record<TableName, string>> = { sales_lines: "/sales", attendance: "/people", receivables_aging: "/collections", people_moves: "/people" };
const show = (v: unknown) => (v == null ? "–" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

export default function UploadFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [table, setTable] = useState<TableName>("sales_lines");
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [checked, setChecked] = useState<Checked | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const sheet = sheets.find(s => s.name === sheetName);
  const def = tableDef(table)!;

  function pickSheet(s: SheetSummary) {
    setSheetName(s.name); setTable(s.table); setMapping(s.mapping); setChecked(null);
  }
  function form(save: boolean) {
    const fd = new FormData();
    fd.set("file", file!); fd.set("sheet", sheetName); fd.set("table", table); fd.set("mapping", JSON.stringify(mapping));
    if (save) fd.set("save", "1");
    return fd;
  }

  function onFile(f: File | null) {
    setFile(f); setSheets([]); setChecked(null); setError("");
    if (!f) return;
    const fd = new FormData(); fd.set("file", f);
    start(async () => {
      const r = await analyzeFile(fd);
      if (r.error) return setError(r.error);
      setSheets(r.sheets!);
      pickSheet(r.sheets!.slice().sort((a, b) => b.rowCount - a.rowCount)[0]);
    });
  }
  const run = (save: boolean) => start(async () => setChecked(await checkImport(form(save))));

  return (
    <div className="upload">
      <section className="panel">
        <div className="ph"><h2>1. Choose a file</h2></div>
        <label className="drop" htmlFor="file">
          <input id="file" type="file" accept=".xlsx,.csv" onChange={e => onFile(e.target.files?.[0] ?? null)} />
          <span>Excel (.xlsx) or CSV, up to 10 MB</span>
        </label>
        {pending && !sheets.length && <p className="muted">Reading the file…</p>}
        {error && <p className="err" role="alert">{error}</p>}
      </section>

      {sheet && <>
        <section className="panel">
          <div className="ph"><h2>2. What is in it?</h2></div>
          <div className="row">
            {sheets.length > 1 && <label className="filters" htmlFor="sheet">Sheet
              <select id="sheet" value={sheetName} onChange={e => pickSheet(sheets.find(s => s.name === e.target.value)!)}>
                {sheets.map(s => <option key={s.name} value={s.name}>{s.name} ({s.rowCount} rows)</option>)}
              </select></label>}
            <label className="filters" htmlFor="table">Contains
              <select id="table" value={table} onChange={e => { const t = e.target.value as TableName; setTable(t); setMapping(guessMapping(tableDef(t)!, sheet.headers)); setChecked(null); }}>
                {TABLE_DEFS.map(d => <option key={d.table} value={d.table}>{d.label}</option>)}
              </select></label>
          </div>
          <p className="muted">{def.description}. {sheet.rowCount} rows found. We matched the columns we recognised; check each one.</p>
          <div className="tablebox"><table>
            <thead><tr><th>Business Desk needs</th><th>Column in your sheet</th><th>First value</th></tr></thead>
            <tbody>{def.fields.map(fd => (
              <tr key={fd.key}>
                <td><label htmlFor={`map-${fd.key}`}>{fd.label}{fd.required ? " *" : ""}</label></td>
                <td><select id={`map-${fd.key}`} value={mapping[fd.key] ?? ""} onChange={e => { setMapping({ ...mapping, [fd.key]: e.target.value || null }); setChecked(null); }}>
                  <option value="">{fd.required ? "Choose a column" : "Not in this sheet"}</option>
                  {sheet.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select></td>
                <td className="muted">{mapping[fd.key] ? show(sheet.sample[0]?.[mapping[fd.key]!]) : ""}</td>
              </tr>))}</tbody>
          </table></div>
          <div className="row"><button type="button" className="btn" disabled={pending} onClick={() => run(false)}>{pending ? "Checking…" : "Check rows"}</button></div>
        </section>
      </>}

      {checked && <section className="panel">
        <div className="ph"><h2>3. {checked.saved ? "Imported" : "Review and import"}</h2></div>
        {checked.errors.map(e => <p key={e} className="err" role="alert">{e}</p>)}
        {checked.warnings.map(w => <p key={w} className="warnline">{w}</p>)}
        {checked.ok && <>
          <p>{checked.total.toLocaleString("en-IN")} rows ready{checked.saved ? " and saved." : ". The first few, as Business Desk will read them:"}</p>
          {!checked.saved && <div className="tablebox"><table>
            <thead><tr>{Object.keys(checked.preview[0] ?? {}).map(k => <th key={k}>{k.replace(/_/g, " ")}</th>)}</tr></thead>
            <tbody>{checked.preview.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{show(v)}</td>)}</tr>)}</tbody>
          </table></div>}
          <div className="row">
            {checked.saved
              ? <Link className="btn" href={SCREEN[table] ?? "/"}>Open {def.label}</Link>
              : <button type="button" className="btn" disabled={pending} onClick={() => run(true)}>{pending ? "Importing…" : `Import ${checked.total.toLocaleString("en-IN")} rows`}</button>}
          </div>
          {!checked.saved && <p className="muted">This replaces any earlier {def.label.toLowerCase()} upload.</p>}
        </>}
      </section>}
    </div>
  );
}
