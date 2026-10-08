# Business Desk

One place for a small business to see sales, collections, finance and people, combined from Excel, Tally and Google Sheets. Works on a phone and can be added to the home screen.

## What's here

| Folder | What it is |
|---|---|
| `web/` | The app (Next.js). Screens: Today, Sales, Collections, Finance, People, Data. |
| `ingest/` | Python adapters that turn a customer's files into the shared tables the screens read. |
| `supabase/` | Database schema. Each business only sees its own rows; staff see sections by role (owner, accounts, HR, sales). |
| `docs/plan.md` | Product approach and the one-month plan. |

How data flows: **source file → adapter (`ingest/`) → shared tables → screens (`web/`)**. A new source (a Tally export, a Google Sheet) needs a new adapter; the screens don't change.

## Run it

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

The app starts on bundled sample data from `web/data/sample-data.json`. No accounts are needed to run it.

**Upload your own sheets** under Data › Upload a sheet: sales, attendance, receivables ageing or joiners and leavers, from `.xlsx` or `.csv` (Tally reports exported to Excel work). The app guesses which column is which, you confirm, it shows what it will import and any rows it had to skip, and the upload then replaces the sample data for that table. Uploads are kept in `web/.data/imports.json` until the database is connected. That suits a local demo or a single pilot machine, not hosting. An attendance starter sheet is at `web/public/templates/attendance-template.xlsx` (regenerate with `node scripts/make-templates.mjs`).

## Rebuild the sample data

```bash
cd ingest
pip install -e ".[dev]"
businessdesk-ingest /path/to/sample/workbooks ../web/data
pytest
```

Duplicate rows in a source (for example the same region and month twice) are dropped with a warning, and the warning is shown on the Data screen.

## Checks

CI runs on every pull request: lint, type check, unit tests and a production build for `web/`; tests for `ingest/`; and the database migration plus a row-level security check on Postgres 16.
