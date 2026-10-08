"""Adapters for the three sample dashboard workbooks used to build the first version.

Each function reads one sheet layout and returns (table_name, DataFrame) in the
shared schema. Real customer files will need their own adapters or the column
mapping step; these are the reference implementations.
"""
from pathlib import Path

import pandas as pd

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def sales_order_lines(path: Path) -> tuple[str, pd.DataFrame]:
    """PivotDashboard workbook, sheet "Data": one row per order line."""
    d = pd.read_excel(path, sheet_name="Data")
    return "sales_lines", pd.DataFrame({
        "date": pd.to_datetime(d["Order Date"]).dt.strftime("%Y-%m-%d"),
        "order_id": d["Order ID"].astype(str),
        "customer": d["Customer Name"],
        "region": d["State"],
        "salesperson": d["Salesperson"],
        "product": d["Product Name"],
        "category": d["Category"],
        "payment": d["Payment Type"],
        "qty": d["Quantity"],
        "revenue": d["Revenue"].round(2),
        "cost": (d["Unit Cost"] * d["Quantity"]).round(2),
        "ship_fee": d["Shipping Fee"].round(2),
    })


def pnl_actual_vs_plan(path: Path) -> tuple[str, pd.DataFrame]:
    """FinancialKPI workbook, sheet "CurrentYearData": metric x scenario x region rows, one column per month."""
    c = pd.read_excel(path, sheet_name="CurrentYearData")
    month_cols = [col for col in c.columns if isinstance(col, pd.Timestamp) or hasattr(col, "month")]
    c = c.dropna(subset=["Category", "State"])
    long = c.melt(id_vars=["Category", "Rev", "State"], value_vars=month_cols, var_name="month", value_name="amount")
    return "pnl_monthly", pd.DataFrame({
        "month": pd.to_datetime(long["month"]).dt.strftime("%Y-%m"),
        "region": long["State"],
        "metric": long["Category"].str.lower(),
        "scenario": long["Rev"].str.lower(),
        "amount": long["amount"].astype(float).round(0),
    })


def receivables_aging(path: Path) -> tuple[str, pd.DataFrame]:
    """FinancialKPI workbook, sheet "Debtors": one row per region per month with ageing buckets."""
    d = pd.read_excel(path, sheet_name="Debtors").dropna(subset=["State", "Month"])
    long = d.melt(id_vars=["State", "Month"], value_vars=["0-30", "31-60", "61-90", "90+"],
                  var_name="bucket", value_name="amount")
    return "receivables_aging", pd.DataFrame({
        "month": pd.to_datetime(long["Month"]).dt.strftime("%Y-%m"),
        "region": long["State"],
        "bucket": long["bucket"],
        "amount": long["amount"].astype(float).round(0),
    })


def people_moves(path: Path, year: int = 2022) -> tuple[str, pd.DataFrame]:
    """FinancialKPI workbook, sheet "HR & Campaign": New Hires / Termination rows by region, Jan..Dec columns.

    The sheet has no year, so it is passed in. Exits are stored as negatives and a few
    cells have the wrong sign, so magnitudes are used.
    """
    h = pd.read_excel(path, sheet_name="HR & Campaign")
    h = h[h["Type"].isin(["New Hires", "Termination"])]
    long = h.melt(id_vars=["Type", "State"], value_vars=MONTHS, var_name="m", value_name="n")
    long["month"] = long["m"].map(lambda m: f"{year}-{MONTHS.index(m) + 1:02d}")
    long["n"] = pd.to_numeric(long["n"]).abs()
    wide = long.pivot_table(index=["month", "State"], columns="Type", values="n", aggfunc="sum").reset_index()
    return "people_moves", pd.DataFrame({
        "month": wide["month"], "region": wide["State"],
        "hires": wide["New Hires"].astype(int), "exits": wide["Termination"].astype(int),
    })


def satisfaction(path: Path) -> tuple[str, pd.DataFrame]:
    """FinancialKPI workbook, sheet "Satisfaction": Value and Target rows by region, one column per year."""
    s = pd.read_excel(path, sheet_name="Satisfaction")
    s = s[s["Score"].isin(["Value", "Target"])]
    year_cols = [c for c in s.columns if c not in ("Score", "State")]
    long = s.melt(id_vars=["Score", "State"], value_vars=year_cols, var_name="year", value_name="v")
    wide = long.pivot_table(index=["year", "State"], columns="Score", values="v").reset_index()
    return "satisfaction", pd.DataFrame({
        "year": wide["year"].astype(int), "region": wide["State"],
        "score": wide["Value"], "target": wide["Target"],
    })


def load_samples(folder: Path) -> list[tuple[str, pd.DataFrame, str]]:
    """Run every sample adapter over the workbooks in folder. Returns (table, frame, source label)."""
    kpi = folder / "S12_FinancialKPI_FINAL.xlsx"
    pivot = folder / "PivotDashboard_FINAL.xlsx"
    jobs = [
        (sales_order_lines, pivot, "Data"),
        (pnl_actual_vs_plan, kpi, "CurrentYearData"),
        (receivables_aging, kpi, "Debtors"),
        (people_moves, kpi, "HR & Campaign"),
        (satisfaction, kpi, "Satisfaction"),
    ]
    out = []
    for fn, path, sheet in jobs:
        table, df = fn(path)
        out.append((table, df, f"{path.name} › {sheet}"))
    return out
