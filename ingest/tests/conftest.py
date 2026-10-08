import datetime as dt

import pandas as pd
import pytest


@pytest.fixture
def sample_folder(tmp_path):
    """Tiny workbooks with the same sheet layouts as the real sample files."""
    sales = pd.DataFrame({
        "Order ID": ["A1", "A2"], "Order Date": [dt.datetime(2023, 1, 5), dt.datetime(2023, 2, 7)],
        "Customer ID": [1, 2], "Customer Name": ["Store Mart", "Foodcorp"], "Address": ["x", "y"],
        "City": ["Sydney", "Perth"], "State": ["NSW", "WA"], "Salesperson": ["Ann", "Raj"],
        "Shipped Date": [dt.datetime(2023, 1, 7), dt.datetime(2023, 2, 9)], "Ship Name": ["a", "b"],
        "Payment Type": ["Cash", "Check"], "Product Name": ["Tea", "Coffee"], "Category": ["Beverages", "Beverages"],
        "Unit Cost": [2.0, 10.0], "Unit Price": [5.0, 20.0], "Quantity": [10, 3], "Revenue": [50.0, 60.0],
        "Shipping Fee": [1.0, 2.0], "Com 5 %": [2.5, 3.0],
    })
    with pd.ExcelWriter(tmp_path / "PivotDashboard_FINAL.xlsx") as w:
        sales.to_excel(w, sheet_name="Data", index=False)

    months = [dt.datetime(2022, m, 1) for m in (1, 2)]
    cur = pd.DataFrame([
        ["Revenue", "Actual", "MI", 100, 110], ["Revenue", "Plan", "MI", 90, 120],
        ["Expense", "Actual", "MI", 60, 70], ["Expense", "Plan", "MI", 50, 80],
        [None, None, None, None, None],
        ["EBIT", "Actual", "MI", 40, 40], ["EBIT", "Plan", "MI", 40, 40],
    ], columns=["Category", "Rev", "State", *months])
    debt = pd.DataFrame([
        ["Debtors", "MI", months[0], 10, 5, 2, 1],
        ["Debtors", "MI", months[1], 12, 6, 3, 2],
        ["Debtors", "MI", months[1], 99, 99, 99, 99],  # duplicate, as in the real file
    ], columns=["Description", "State", "Month", "0-30", "31-60", "61-90", "90+"])
    mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    hr = pd.DataFrame([
        ["Termination", "MI", *([-1] * 11), 2],  # one wrongly-signed cell
        ["New Hires", "MI", *([3] * 12)],
    ], columns=["Type", "State", *mon])
    sat = pd.DataFrame([
        ["Poor", "MI", 0.5, 0.6], ["Value", "MI", 0.8, 0.85], ["Target", "MI", 0.9, 0.9],
    ], columns=["Score", "State", 2021, 2022])
    with pd.ExcelWriter(tmp_path / "S12_FinancialKPI_FINAL.xlsx") as w:
        cur.to_excel(w, sheet_name="CurrentYearData", index=False)
        debt.to_excel(w, sheet_name="Debtors", index=False)
        hr.to_excel(w, sheet_name="HR & Campaign", index=False)
        sat.to_excel(w, sheet_name="Satisfaction", index=False)
    return tmp_path
