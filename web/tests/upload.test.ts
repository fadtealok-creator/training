import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { fromGrid, parseCsv, readWorkbook } from "@/lib/sheets";
import { applyMapping, guessMapping, guessTable } from "@/lib/mapping";
import { attendanceSummary } from "@/lib/metrics";
import type { AttendanceRow } from "@/lib/types";

let dir = "";
beforeAll(async () => { dir = await mkdtemp(path.join(tmpdir(), "bd-")); process.env.BUSINESSDESK_DATA_DIR = dir; });
afterAll(async () => { await rm(dir, { recursive: true, force: true }); });

describe("reading sheets", () => {
  it("skips report title rows above the header, as in Tally exports", () => {
    const s = fromGrid("Sales", [["Sharma Traders"], ["Sales Register 1-Apr-26 to 30-Apr-26"], [], ["Date", "Party Name", "Value"], ["01/04/2026", "A", 10]]);
    expect(s.headers).toEqual(["Date", "Party Name", "Value"]);
    expect(s.headerRow).toBe(4);
    expect(s.rows).toEqual([{ Date: "01/04/2026", "Party Name": "A", Value: 10 }]);
  });
  it("parses quoted CSV", () => {
    expect(parseCsv('﻿Name,Note\r\n"Shah, R","said ""hi"""\n')).toEqual([["Name", "Note"], ["Shah, R", 'said "hi"']]);
  });
  it("reads the attendance template end to end", async () => {
    const buf = await readFile(path.join(__dirname, "../public/templates/attendance-template.xlsx"));
    const sheets = await readWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "attendance-template.xlsx");
    const s = sheets.find(x => x.name === "Attendance")!;
    const def = guessTable(s.headers);
    expect(def.table).toBe("attendance");
    const res = applyMapping(def, guessMapping(def, s.headers), s.rows, s.headerRow + 1);
    expect(res.errors).toEqual([]);
    expect(res.rows.map(r => r.status)).toEqual(["P", "A", "L"]);
    expect(res.rows[0]).toMatchObject({ date: "2026-10-01", in_time: "09:20" });
  });
  it("reads formula results and rejects other file types", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("S");
    ws.addRow(["Qty", "Rate", "Amount"]);
    ws.addRow([2, 5, { formula: "A2*B2", result: 10 }]);
    const buf = await wb.xlsx.writeBuffer();
    const [s] = await readWorkbook(buf as ArrayBuffer, "x.xlsx");
    expect(s.rows[0].Amount).toBe(10);
    await expect(readWorkbook(new ArrayBuffer(4), "old.xls")).rejects.toThrow(/save as .xlsx/);
  });
});

describe("store", () => {
  it("saves uploads, replaces per table and feeds the dataset", async () => {
    const { saveImport, listImports, removeImport } = await import("@/lib/store");
    const { getDataset } = await import("@/lib/data");
    const row = (s: AttendanceRow["status"]): AttendanceRow => ({ date: "2026-10-01", employee_id: "E1", name: "A", branch: "Main", status: s, in_time: null, out_time: null });
    await saveImport({ table: "attendance", file: "a.xlsx", sheet: "S", rows: [row("P")], warnings: [] });
    const second = await saveImport({ table: "attendance", file: "b.xlsx", sheet: "S", rows: [row("A")], warnings: ["w"] });
    expect(await listImports()).toHaveLength(1);
    const d = await getDataset();
    expect(d.tables.attendance).toHaveLength(1);
    expect(d.sources.attendance).toMatchObject({ label: "b.xlsx › S", warnings: ["w"] });
    expect(d.tables.sales_lines.length).toBe(351); // sample still used for other tables
    await removeImport(second.id);
    expect((await getDataset()).tables.attendance).toEqual([]);
  });
});

describe("attendance summary", () => {
  it("leaves holidays out of the rate", () => {
    const r = (date: string, id: string, status: AttendanceRow["status"]): AttendanceRow => ({ date, employee_id: id, name: id, branch: "Main", status, in_time: null, out_time: null });
    const s = attendanceSummary([r("2026-10-01", "E1", "P"), r("2026-10-01", "E2", "A"), r("2026-10-02", "E1", "H"), r("2026-10-02", "E2", "H"), r("2026-10-03", "E1", "P"), r("2026-10-03", "E2", "L")]);
    expect(s.rate).toBeCloseTo(2 / 4);
    expect(s.byDate.map(x => x.date)).toEqual(["2026-10-01", "2026-10-03"]);
    expect(s.byEmployee[0]).toMatchObject({ id: "E2", present: 0, rate: 0 });
  });
});
