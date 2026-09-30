"use client";
import Link from "next/link";

/** External sister apps — keeps core Hatch fast (hub-and-spoke). */
export const ECOSYSTEM_APPS = [
  {
    id: "notes",
    title: "Notes Hub",
    blurb: "CIE papers & study packs",
    emoji: "📚",
    href: "https://drive.google.com",
    external: true,
  },
  {
    id: "living",
    title: "Living",
    blurb: "PGs & flatmates near BTR",
    emoji: "🏠",
    href: "https://www.facebook.com/groups",
    external: true,
  },
  {
    id: "market",
    title: "Marketplace",
    blurb: "Lab coats, books, calculators",
    emoji: "🛒",
    href: "https://www.olx.in",
    external: true,
  },
  {
    id: "fuel",
    title: "Late-Night Fuel",
    blurb: "Canteen & midnight runs",
    emoji: "🍜",
    href: "https://www.swiggy.com",
    external: true,
  },
] as const;

export function EcosystemPortalGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {ECOSYSTEM_APPS.map((app) => (
        <a
          key={app.id}
          href={app.href}
          target="_blank"
          rel="noopener noreferrer"
          className="card"
          style={{
            textDecoration: "none",
            color: "inherit",
            padding: compact ? 10 : 12,
            margin: 0,
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>{app.emoji}</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{app.title}</div>
          {!compact && (
            <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>{app.blurb}</p>
          )}
        </a>
      ))}
    </div>
  );
}

export function EcosystemDrawerCard({
  showSparks = false,
}: {
  showSparks?: boolean;
}) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="h2" style={{ marginBottom: 6 }}>Hatch Ecosystem</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Heavy tools live outside core app so Hatch stays fast.
      </p>
      <EcosystemPortalGrid />
      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Link href="/club-admin" className="btn-ghost btn-sm">Club Core portal</Link>
        {showSparks && (
          <Link href="/sparks" className="btn-ghost btn-sm">Campus Sparks</Link>
        )}
      </div>
      <p className="muted" style={{ fontSize: 10, marginTop: 8 }}>
        Sister modules · admin can hide Sparks
      </p>
    </div>
  );
}
