// Writes the downloadable starter sheets in public/templates. Run: node scripts/make-templates.mjs
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Attendance");
ws.columns = [
  { header: "Date", key: "date", width: 12, style: { numFmt: "dd/mm/yyyy" } },
  { header: "Employee ID", key: "id", width: 13 },
  { header: "Name", key: "name", width: 22 },
  { header: "Branch", key: "branch", width: 14 },
  { header: "Status", key: "status", width: 9 },
  { header: "In Time", key: "in", width: 9 },
  { header: "Out Time", key: "out", width: 9 },
];
ws.getRow(1).font = { bold: true };
ws.views = [{ state: "frozen", ySplit: 1 }];
const d = new Date(Date.UTC(2026, 9, 1));
ws.addRow({ date: d, id: "E001", name: "Example Person", branch: "Main", status: "P", in: "09:20", out: "18:05" });
ws.addRow({ date: d, id: "E002", name: "Example Person 2", branch: "Main", status: "A" });
ws.addRow({ date: d, id: "E003", name: "Example Person 3", branch: "Warehouse", status: "L" });
ws.dataValidations.add("E2:E5000", { type: "list", allowBlank: false, formulae: ['"P,A,L,H"'] });

const help = wb.addWorksheet("How to fill");
[
  ["One row per employee per day. Replace the example rows with your own."],
  ["Status: P = present, A = absent, L = leave (CL, SL, EL, half day), H = holiday or weekly off."],
  ["In Time and Out Time are optional, as 09:30 or 9:30 AM."],
  ["Upload this file in Business Desk under Data › Upload a sheet."],
].forEach(r => help.addRow(r));
help.getColumn(1).width = 100;

await wb.xlsx.writeFile(new URL("../public/templates/attendance-template.xlsx", import.meta.url));
console.log("wrote public/templates/attendance-template.xlsx");
