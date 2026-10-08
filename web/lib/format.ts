// Indian number style: lakh (1,00,000) and crore (1,00,00,000).
export function money(n: number): string {
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e7) return `${s}${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}${(a / 1e5).toFixed(2)} L`;
  return s + Math.round(a).toLocaleString("en-IN");
}
export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
export const signed = (n: number) => (n >= 0 ? "+" : "") + n;
export const signedPct = (n: number, digits = 1) => (n >= 0 ? "+" : "") + pct(n, digits);
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1];
