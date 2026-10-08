import json

import pandas as pd
import pytest

from businessdesk_ingest import cli
from businessdesk_ingest.adapters import excel_samples as ex
from businessdesk_ingest.schema import SchemaError, validate


def test_sales_lines_compute_cost(sample_folder):
    table, df = ex.sales_order_lines(sample_folder / "PivotDashboard_FINAL.xlsx")
    df, warnings = validate(table, df)
    assert warnings == []
    assert df["cost"].tolist() == [20.0, 30.0]
    assert df["date"].tolist() == ["2023-01-05", "2023-02-07"]


def test_pnl_is_long_and_skips_blank_rows(sample_folder):
    table, df = ex.pnl_actual_vs_plan(sample_folder / "S12_FinancialKPI_FINAL.xlsx")
    df, _ = validate(table, df)
    assert len(df) == 6 * 2
    row = df[(df.metric == "revenue") & (df.scenario == "plan") & (df.month == "2022-02")]
    assert row.amount.item() == 120


def test_duplicate_receivables_keep_first_and_warn(sample_folder):
    table, df = ex.receivables_aging(sample_folder / "S12_FinancialKPI_FINAL.xlsx")
    df, warnings = validate(table, df)
    assert len(df) == 8
    assert df[(df.month == "2022-02") & (df.bucket == "90+")].amount.item() == 2
    assert len(warnings) == 1 and "duplicate" in warnings[0]


def test_people_moves_use_magnitudes(sample_folder):
    table, df = ex.people_moves(sample_folder / "S12_FinancialKPI_FINAL.xlsx")
    df, _ = validate(table, df)
    assert df.exits.sum() == 11 + 2
    assert df.hires.sum() == 36


def test_satisfaction_keeps_value_and_target(sample_folder):
    table, df = ex.satisfaction(sample_folder / "S12_FinancialKPI_FINAL.xlsx")
    df, _ = validate(table, df)
    assert df[df.year == 2022].score.item() == pytest.approx(0.85)


def test_validate_rejects_unknown_metric():
    df = pd.DataFrame([{"month": "2022-01", "region": "MI", "metric": "profit", "scenario": "actual", "amount": 1.0}])
    with pytest.raises(SchemaError, match="unexpected values"):
        validate("pnl_monthly", df)


def test_validate_rejects_missing_column():
    with pytest.raises(SchemaError, match="missing columns"):
        validate("people_moves", pd.DataFrame([{"month": "2022-01", "region": "MI"}]))


def test_cli_writes_bundle(sample_folder, tmp_path):
    out = tmp_path / "out"
    cli.main([str(sample_folder), str(out)])
    bundle = json.loads((out / "sample-data.json").read_text())
    assert set(bundle["tables"]) == {"sales_lines", "pnl_monthly", "receivables_aging", "people_moves", "satisfaction"}
    assert bundle["sources"]["receivables_aging"]["warnings"]
