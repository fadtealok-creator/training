import type { SourceInfo } from "@/lib/types";

export function Tile({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="tile">
      <span className="lab">{label}</span>
      <span className="val">{value}</span>
      {sub && <span className="sub">{sub}</span>}
      {children}
    </div>
  );
}

export function Chip({ level, children }: { level: "good" | "warn" | "bad"; children: React.ReactNode }) {
  return <span className={`chip ${level}`}>{children}</span>;
}

/** Shows where a number came from, so owners can trust it and fix the source. */
export function Source({ info }: { info: SourceInfo }) {
  return <span className="chip src" title={`${info.rows} rows`}>{info.label.replace("_FINAL.xlsx", "")}</span>;
}

export function Panel({ title, source, children }: { title: string; source?: SourceInfo; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="ph"><h2>{title}</h2>{source && <Source info={source} />}</div>
      {children}
    </section>
  );
}

export function Head({ title, intro, children }: { title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <div className="sechead">
      <div><h1>{title}</h1>{intro && <p>{intro}</p>}</div>
      {children}
    </div>
  );
}

export const regionParam = (sp: { region?: string | string[] }, allowed: string[]) => {
  const r = Array.isArray(sp.region) ? sp.region[0] : sp.region;
  return r && allowed.includes(r) ? r : "all";
};
