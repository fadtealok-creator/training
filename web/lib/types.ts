// Mirrors ingest/businessdesk_ingest/schema.py and supabase/migrations.
export type SalesLine = {
  date: string; order_id: string; customer: string; region: string; salesperson: string;
  product: string; category: string; payment: string; qty: number; revenue: number; cost: number; ship_fee: number;
};
export type PnlRow = { month: string; region: string; metric: "revenue" | "expense" | "ebit"; scenario: "actual" | "plan"; amount: number };
export type AgingRow = { month: string; region: string; bucket: Bucket; amount: number };
export type PeopleRow = { month: string; region: string; hires: number; exits: number };
export type SatisfactionRow = { year: number; region: string; score: number; target: number };
export type Bucket = "0-30" | "31-60" | "61-90" | "90+";
export const BUCKETS: Bucket[] = ["0-30", "31-60", "61-90", "90+"];

export type SourceInfo = { label: string; rows: number; warnings: string[] };
export type Dataset = {
  sources: Record<keyof Dataset["tables"], SourceInfo>;
  tables: {
    sales_lines: SalesLine[];
    pnl_monthly: PnlRow[];
    receivables_aging: AgingRow[];
    people_moves: PeopleRow[];
    satisfaction: SatisfactionRow[];
  };
};
export type TableName = keyof Dataset["tables"];
