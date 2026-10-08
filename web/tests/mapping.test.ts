import { describe, expect, it } from "vitest";
import { applyMapping, guessMapping, guessTable, tableDef, toDate, toMonth, toNumber, toStatus, toTime } from "@/lib/mapping";

describe("value conversion", () => {
  it("reads dates day-first, as Indian sheets write them", () => {
    expect(toDate("05/04/2026")).toBe("2026-04-05");
    expect(toDate("5-4-26")).toBe("2026-04-05");
    expect(toDate("05-Apr-2026")).toBe("2026-04-05");
    expect(toDate("2026-04-05")).toBe("2026-04-05");
    expect(toDate(46117)).toBe("2026-04-05"); // Excel serial
    expect(toDate(new Date(Date.UTC(2026, 3, 5)))).toBe("2026-04-05");
    expect(toDate("31/02/2026")).toBeNull();
    expect(toDate("not a date")).toBeNull();
  });
  it("reads months", () => {
    expect(toMonth("Apr-26")).toBe("2026-04");
    expect(toMonth("April 2026")).toBe("2026-04");
    expect(toMonth("2026-4")).toBe("2026-04");
    expect(toMonth("15/04/2026")).toBe("2026-04");
  });
  it("reads Indian and accounting number formats", () => {
    expect(toNumber("₹1,25,000.50")).toBe(125000.5);
    expect(toNumber("Rs. 2,000")).toBe(2000);
    expect(toNumber("(500)")).toBe(-500);
    expect(toNumber("1,200 Cr")).toBe(-1200);
    expect(toNumber("1,200 Dr")).toBe(1200);
    expect(toNumber("abc")).toBeNull();
    expect(toNumber("")).toBeNull();
  });
  it("reads times and attendance codes", () => {
    expect(toTime("9:05 AM")).toBe("09:05");
    expect(toTime("6:30 pm")).toBe("18:30");
    expect(toTime(0.5)).toBe("12:00");
    expect(toStatus("Present")).toBe("P");
    expect(toStatus("CL")).toBe("L");
    expect(toStatus("WO")).toBe("H");
    expect(toStatus("?")).toBeNull();
  });
});

describe("guessing", () => {
  it("maps a Tally sales register export", () => {
    const headers = ["Date", "Particulars", "Voucher No.", "Party Name", "Quantity", "Rate", "Value"];
    const def = guessTable(headers);
    expect(def.table).toBe("sales_lines");
    const m = guessMapping(def, headers);
    expect(m).toMatchObject({ date: "Date", order_id: "Voucher No.", customer: "Party Name", qty: "Quantity", revenue: "Value", product: "Particulars" });
  });
  it("recognises an attendance register", () => {
    const headers = ["Emp Code", "Employee Name", "Date", "Status", "In Time", "Out Time", "Department"];
    const def = guessTable(headers);
    expect(def.table).toBe("attendance");
    expect(guessMapping(def, headers)).toMatchObject({ employee_id: "Emp Code", name: "Employee Name", in_time: "In Time", branch: "Department" });
  });
  it("uses each column once", () => {
    const m = guessMapping(tableDef("sales_lines")!, ["Date", "Amount"]);
    expect(Object.values(m).filter(v => v === "Date")).toHaveLength(1);
  });
});

describe("applyMapping", () => {
  const att = tableDef("attendance")!;
  const mapping = { date: "D", employee_id: "ID", name: "N", branch: null, status: "S", in_time: null, out_time: null };

  it("converts, defaults and skips bad rows with row numbers", () => {
    const res = applyMapping(att, mapping, [
      { D: "01/10/2026", ID: "E1", N: "Asha", S: "P" },
      { D: "01/10/2026", ID: "E2", N: "Ravi", S: "maybe" },
      { D: null, ID: null, N: null, S: null },
      { D: "01/10/2026", ID: "E1", N: "Asha", S: "A" },
    ]);
    expect(res.rows).toEqual([{ date: "2026-10-01", employee_id: "E1", name: "Asha", branch: "Main", status: "P", in_time: null, out_time: null }]);
    expect(res.skipped).toBe(1);
    expect(res.warnings[0]).toContain("row 3");
    expect(res.warnings[1]).toContain("duplicate");
  });

  it("refuses when a required column isn't chosen", () => {
    const res = applyMapping(att, { ...mapping, status: null }, [{ D: "01/10/2026" }]);
    expect(res.rows).toHaveLength(0);
    expect(res.errors[0]).toContain("Status");
  });

  it("splits ageing columns into one row per bucket", () => {
    const res = applyMapping(tableDef("receivables_aging")!, { month: "M", region: "R", b0_30: "a", b31_60: "b", b61_90: "c", b90: "d" },
      [{ M: "Sep-26", R: "Pune", a: "1,000", b: 500, c: 0, d: "(10)" }]);
    expect(res.rows).toEqual([
      { month: "2026-09", region: "Pune", bucket: "0-30", amount: 1000 },
      { month: "2026-09", region: "Pune", bucket: "31-60", amount: 500 },
      { month: "2026-09", region: "Pune", bucket: "61-90", amount: 0 },
      { month: "2026-09", region: "Pune", bucket: "90+", amount: -10 },
    ]);
  });
});
