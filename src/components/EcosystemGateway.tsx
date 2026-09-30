"use client";

/** External sister apps — keeps core Hatch fast (anti-congestion). Replace URLs when sister apps go live. */
export const ECOSYSTEM_APPS = [
  {
    id: "notes",
    title: "Notes Hub",
    blurb: "CIE papers & study packs",
    emoji: "📚",
    href: "https://drive.google.com", // replace with Hatch Notes
  },
  {
    id: "living",
    title: "Living",
    blurb: "PGs & flatmates near BTR",
    emoji: "🏠",
    href: "https://www.facebook.com/groups", // replace with Hatch Living
  },
  {
    id: "market",
    title: "Marketplace",
    blurb: "Lab coats, books, calculators",
    emoji: "🛒",
    href: "https://www.olx.in", // replace with Hatch Market
  },
  {
    id: "fuel",
    title: "Late-Night Fuel",
    blurb: "Canteen & midnight runs",
    emoji: "🍜",
    href: "https://www.swiggy.com", // replace with Hatch Fuel
  },
] as const;

export function EcosystemPortalGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}
    >
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
            transition: "transform 0.15s ease, border-color 0.15s",
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>{app.emoji}</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{app.title}</div>
          {!compact && (
            <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>
              {app.blurb}
            </p>
          )}
        </a>
      ))}
    </div>
  );
}

export function EcosystemDrawerCard() {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="h2" style={{ marginBottom: 6 }}>
        Hatch Ecosystem
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Heavy tools live outside the core app so Hatch stays fast.
      </p>
      <EcosystemPortalGrid />
      <p className="muted" style={{ fontSize: 10, marginTop: 8 }}>
        Opens in browser · sister apps
      </p>
    </div>
  );
}
