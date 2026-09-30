"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/sparks", label: "Discover", icon: "♡" },
  { href: "/sparks/likes", label: "Likes", icon: "★" },
  { href: "/sparks/matches", label: "Matches", icon: "◆" },
  { href: "/sparks/me", label: "Me", icon: "●" },
];

export default function SparksNav() {
  const path = usePathname();
  return (
    <nav
      className="nav"
      aria-label="Sparks"
      style={{ borderTop: "1px solid rgba(236,72,153,0.35)" }}
    >
      {items.map((it) => {
        const on =
          it.href === "/sparks"
            ? path === "/sparks"
            : path === it.href || path.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={on ? "on" : ""}
            style={on ? { color: "#f472b6" } : undefined}
          >
            <span className="nav-icon">{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
