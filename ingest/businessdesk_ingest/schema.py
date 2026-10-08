"""The shared tables every source is mapped into.

Screens only read these tables, so supporting a new source (a Tally export, a
Google Sheet) means writing an adapter, not changing the dashboard. Keep this in
step with supabase/migrations.
"""
import pandas as pd

TABLES: dict[str, dict[str, str]] = {
    "sales_lines": {
        "date": "date", "order_id": "str", "customer": "str", "region": "str", "salesperson": "str",
        "product": "str", "category": "str", "payment": "str", "qty": "num", "revenue": "num",
        "cost": "num", "ship_fee": "num",
    },
    "pnl_monthly": {"month": "month", "region": "str", "metric": "str", "scenario": "str", "amount": "num"},
    "receivables_aging": {"month": "month", "region": "str", "bucket": "str", "amount": "num"},
    "people_moves": {"month": "month", "region": "str", "hires": "num", "exits": "num"},
    "satisfaction": {"year": "num", "region": "str", "score": "num", "target": "num"},
}

ENUMS = {
    ("pnl_monthly", "metric"): {"revenue", "expense", "ebit"},
    ("pnl_monthly", "scenario"): {"actual", "plan"},
    ("receivables_aging", "bucket"): {"0-30", "31-60", "61-90", "90+"},
}


# One row per key; a second row for the same key is a data problem in the source.
KEYS = {
    "sales_lines": ["order_id"],
    "pnl_monthly": ["month", "region", "metric", "scenario"],
    "receivables_aging": ["month", "region", "bucket"],
    "people_moves": ["month", "region"],
    "satisfaction": ["year", "region"],
}


class SchemaError(ValueError):
    pass


def validate(table: str, df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Check columns, types and allowed values.

    Returns the frame in canonical column order plus warnings for problems that were
    fixed automatically (duplicate keys keep the first row). Raises SchemaError for
    problems that can't be fixed.
    """
    if table not in TABLES:
        raise SchemaError(f"Unknown table {table!r}")
    cols = TABLES[table]
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise SchemaError(f"{table}: missing columns {missing}")
    df = df[list(cols)].copy()
    for col, kind in cols.items():
        if df[col].isna().any():
            raise SchemaError(f"{table}.{col}: {int(df[col].isna().sum())} empty values")
        if kind == "num" and not pd.api.types.is_numeric_dtype(df[col]):
            raise SchemaError(f"{table}.{col}: expected numbers")
        if kind == "date" and not df[col].astype(str).str.fullmatch(r"\d{4}-\d{2}-\d{2}").all():
            raise SchemaError(f"{table}.{col}: expected YYYY-MM-DD dates")
        if kind == "month" and not df[col].astype(str).str.fullmatch(r"\d{4}-\d{2}").all():
            raise SchemaError(f"{table}.{col}: expected YYYY-MM months")
        allowed = ENUMS.get((table, col))
        if allowed is not None:
            bad = set(df[col]) - allowed
            if bad:
                raise SchemaError(f"{table}.{col}: unexpected values {sorted(bad)}")
    warnings = []
    dup = df.duplicated(subset=KEYS[table], keep="first")
    if dup.any():
        sample = df.loc[dup, KEYS[table]].head(3).to_dict(orient="records")
        warnings.append(f"{table}: {int(dup.sum())} duplicate rows ignored, e.g. {sample}")
        df = df[~dup].reset_index(drop=True)
    return df, warnings
