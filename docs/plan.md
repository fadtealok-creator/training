# Business Desk: product approach and one-month plan

Written 2026-10-08. Timeline: 2026-10-08 to 2026-11-07.

Prototype (single-page mock-up): https://claude.ai/artifact/4RPd77ZWsahA2HYDTSUCiE

## What the sample data covers

| Area | Where it is | What's there | Gap |
|---|---|---|---|
| Sales | PivotDashboard › Data | 351 order lines, 2023: customer, product, salesperson, payment type, qty, revenue, cost | Customer ID is not unique per customer |
| Collections | S12_FinancialKPI › Debtors | Receivables ageing (0-30 / 31-60 / 61-90 / 90+) by region per month, 2022 | No invoice-level detail, so no "who owes what" list yet |
| Finance | S12_FinancialKPI › CurrentYearData | Revenue, expense, EBIT, actual vs plan, monthly by region, 2022 | |
| HR | S12_FinancialKPI › HR & Campaign; CompanyDashboard › FinanceData | Monthly hires and exits by region; FTE count by US state | **No attendance and no employee performance data** |
| Customer | S12_FinancialKPI › Satisfaction | Satisfaction score vs target by region, 2019-22 | |

The files don't join: they describe different businesses, years and geographies, and only share a "State" column that means different things in each. That's fine for a demo. It also shows the real design problem: every customer's files will look different, so the product needs a mapping step that turns any sheet into the same few shared tables (`sales_lines`, `receivables_aging`, `pnl_monthly`, `people_moves`, `attendance`), and the screens only ever read those tables.

## Recommended approach: custom web app, installable on phones

**Recommendation:** build a custom app rather than embedding a BI tool (Power BI, Metabase, Looker Studio). BI tools are fast to start but charge per viewer, look like analyst software on a phone, and can't do guided onboarding or reminders. A business owner needs five screens and alerts, not a report builder.

| Layer | Choice | Why |
|---|---|---|
| App | Next.js (React) as a PWA | One codebase for desktop and phone, "Add to home screen" without app-store approval |
| Database, login | Supabase (Postgres) in the Mumbai region | Built-in auth (email/OTP/Google), row-level security keeps each customer's data separate, data stays in India for DPDP |
| Ingestion | Python workers (pandas), same adapters as `ingest.py` | Each source is an adapter into the shared tables |
| Hosting | Vercel + Supabase | Low cost at small scale; move later if needed |
| Billing | Razorpay subscriptions | UPI and cards for Indian MSMEs |

**Sources**
- **Excel**: upload screen with a column-mapping step ("which column is the invoice date?"), remembered per customer so the next month's upload is one tap.
- **Google Sheets**: Google sign-in once, pick the sheet, refresh on a schedule.
- **Tally**: phase 1 is uploading Tally's standard exports (Day Book, Outstanding Receivables, Stock Summary as Excel/XML). Phase 2 is a small Windows connector that reads TallyPrime's local XML port and pushes to the cloud nightly, since Tally runs on the customer's PC and isn't reachable from the internet.

**Who sees what**: owner sees everything; HR, sales and accounts users see their own sections. One login, one app.

## One-month plan

| Week | Dates | Deliverables |
|---|---|---|
| 1 | Oct 8-14 | Lock the KPI list per section with 1-2 pilot customers. Get one real Tally export and one attendance register. Repo, database, login and multi-customer setup. |
| 2 | Oct 15-21 | Excel upload with column mapping, Google Sheets connector, Tally export import. All into the shared tables, with a data-quality check per upload. |
| 3 | Oct 22-28 | Port the prototype screens to the app: Today, Sales, Collections, Finance, People (with attendance). Roles. Phone layout. Alerts on the Today screen. |
| 4 | Oct 29-Nov 7 | Pilot onboarding, fixes from pilot feedback, Tally desktop connector beta, billing, landing page. |

**Risks**: Tally layouts vary between customers (mitigate with the mapping step and early real samples); the attendance format is unknown until a pilot shares theirs; one month is tight for the live Tally connector, so it is the first thing to slip to month two.

## Needed from Alok
1. A GitHub repository attached to this project, so the real app can be built there.
2. One real (or anonymised) Tally export and one attendance sheet, so the mapping is built against real layouts.
3. One or two pilot businesses for weeks 1 and 4.
