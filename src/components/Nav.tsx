"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Primary IA: Home · Discover · Create · Inbox · Profile */
const items = [
  { href: "/home", label: "Home", icon: "⌂" },
  { href: "/discover", label: "Discover", icon: "◎" },
  { href: "/create", label: "Create", icon: "+", create: true },
  { href: "/inbox", label: "Inbox", icon: "◇" },
  { href: "/profile", label: "Profile", icon: "○" },
];

export default function Nav() {
  const path = usePathname();
  const hide =
    path.startsWith("/chat/") ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/auth") ||
    path.startsWith("/terms");

  if (hide) return null;

  return (
    <nav className="nav" aria-label="Main">
      {items.map((it) => {
        const on =
          path === it.href ||
          (it.href !== "/home" && path.startsWith(it.href + "/")) ||
          (it.href === "/profile" && path.startsWith("/settings"));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`${on ? "on" : ""}${it.create ? " create-tab" : ""}`}
            aria-current={on ? "page" : undefined}
            aria-label={it.label}
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
