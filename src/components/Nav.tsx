"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Pulse", icon: "•" },
  { href: "/discover", label: "Match", icon: "◎" },
  { href: "/teams", label: "Teams", icon: "△" },
  { href: "/clubs", label: "Clubs", icon: "✦" },
  { href: "/inbox", label: "Inbox", icon: "◇" },
  { href: "/profile", label: "You", icon: "●" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {items.map((it) => {
        const on = path === it.href || path.startsWith(it.href + "/");
        return (
          <Link key={it.href} href={it.href} className={on ? "on" : ""}>
            <span className="nav-icon">{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
