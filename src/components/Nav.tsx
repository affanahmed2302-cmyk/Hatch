"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Home", icon: "⌂" },
  { href: "/discover", label: "People", icon: "◎" },
  { href: "/lounge", label: "Lounge", icon: "◈" },
  { href: "/inbox", label: "Chat", icon: "◇" },
  { href: "/profile", label: "You", icon: "●" },
];

export default function Nav() {
  const path = usePathname();
  const hide =
    path.startsWith("/chat/") ||
    path === "/lounge" ||
    path.startsWith("/lounge/") ||
    path.startsWith("/sparks") ||
    path === "/pilot" ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/onboarding");

  if (hide) return null;

  return (
    <nav className="nav" aria-label="Main">
      {items.map((it) => {
        const on =
          path === it.href ||
          (it.href !== "/home" && path.startsWith(it.href + "/"));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={on ? "on" : ""}
            aria-current={on ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden>
              {it.icon}
            </span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
