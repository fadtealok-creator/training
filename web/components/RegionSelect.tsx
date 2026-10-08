"use client";
import { usePathname, useRouter } from "next/navigation";

export default function RegionSelect({ regions, value }: { regions: string[]; value: string }) {
  const router = useRouter(), path = usePathname();
  return (
    <label className="filters" htmlFor="region">
      Region
      <select id="region" value={value} onChange={e => router.push(e.target.value === "all" ? path : `${path}?region=${encodeURIComponent(e.target.value)}`)}>
        <option value="all">All regions</option>
        {regions.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
    </label>
  );
}
