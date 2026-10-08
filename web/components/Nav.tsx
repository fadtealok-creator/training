"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, JSX.Element> = {
  "/": <path d="M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />,
  "/sales": <path d="M4 19V9M10 19V5M16 19v-7M21 19H3" />,
  "/collections": <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  "/finance": <path d="M4 17l5-5 4 3 7-8M15 7h5v5" />,
  "/people": <><circle cx="9" cy="8" r="3" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 010 6M21 19c0-2-1.5-4-4-4.6" /></>,
  "/data": <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3 3 7 3s7-1.3 7-3v-6" /></>,
};
const LINKS: [string, string][] = [["/", "Today"], ["/sales", "Sales"], ["/collections", "Collections"], ["/finance", "Finance"], ["/people", "People"], ["/data", "Data"]];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Sections">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[href]}</svg>
          {label}
        </Link>
      ))}
    </nav>
  );
}
