import { describe, expect, it } from "vitest";
import sample from "@/data/sample-data.json";
import { agingBuckets, buildAlerts, latestMonth, overdueShare, peopleTotals, pnlTotal, salesSummary } from "@/lib/metrics";
import { money, pct } from "@/lib/format";
import type { Dataset } from "@/lib/types";

const d = sample as unknown as Dataset;

describe("format", () => {
  it("uses lakh and crore", () => {
    expect(money(413955.42)).toBe("4.14 L");
    expect(money(62014151)).toBe("6.20 Cr");
    expect(money(84283)).toBe("84,283");
    expect(money(-150000)).toBe("−1.50 L");
  });
});

describe("metrics on the sample data", () => {
  it("sales totals match the source workbook", () => {
    const s = salesSummary(d.tables.sales_lines);
    expect(s.revenue).toBeCloseTo(413955.42, 2);
    expect(s.orders).toBe(351);
    expect(s.units).toBe(19795);
    expect(salesSummary(d.tables.sales_lines, "NSW").revenue).toBeLessThan(s.revenue);
  });

  it("EBIT equals revenue minus expense", () => {
    const p = d.tables.pnl_monthly;
    expect(pnlTotal(p, "ebit", "actual")).toBeCloseTo(pnlTotal(p, "revenue", "actual") - pnlTotal(p, "expense", "actual"), -2);
  });

  it("ageing uses the latest month only", () => {
    const a = d.tables.receivables_aging;
    expect(latestMonth(a)).toBe("2022-12");
    const b = agingBuckets(a, "2022-12");
    expect(b).toHaveLength(4);
    expect(pct(overdueShare(b))).toBe("6.8%");
  });

  it("people totals", () => {
    expect(peopleTotals(d.tables.people_moves)).toEqual({ hires: 638, exits: 294, net: 344 });
  });

  it("alerts put problems before good news", () => {
    const alerts = buildAlerts(d, money, v => pct(v));
    expect(alerts.length).toBeGreaterThan(2);
    expect(alerts[0].level).toBe("bad");
    expect(alerts[alerts.length - 1].level).toBe("good");
  });
});
