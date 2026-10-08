"""Command line: read the sample workbooks and write the shared tables as JSON and CSV.

    businessdesk-ingest <folder with workbooks> <output folder>

The JSON bundle is what the web app reads when no database is configured.
"""
import argparse
import json
from pathlib import Path

import pandas as pd

from .adapters.excel_samples import load_samples
from .schema import validate


def build_bundle(src: Path) -> dict:
    bundle = {"sources": {}, "tables": {}}
    for table, df, label in load_samples(src):
        df, warnings = validate(table, df)
        bundle["tables"][table] = df.to_dict(orient="records")
        bundle["sources"][table] = {"label": label, "rows": len(df), "warnings": warnings}
    return bundle


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("src", type=Path)
    p.add_argument("out", type=Path)
    args = p.parse_args(argv)
    bundle = build_bundle(args.src)
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "sample-data.json").write_text(json.dumps(bundle, separators=(",", ":"), ensure_ascii=False))
    for table, rows in bundle["tables"].items():
        pd.DataFrame(rows).to_csv(args.out / f"{table}.csv", index=False)
        meta = bundle["sources"][table]
        print(f"{table:18} {len(rows):5} rows  <- {meta['label']}")
        for w in meta["warnings"]:
            print(f"  warning: {w}")


if __name__ == "__main__":
    main()
