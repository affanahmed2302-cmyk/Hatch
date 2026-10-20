"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GAMES } from "@/lib/games/catalog";
import Nav from "@/components/Nav";

type Gang = { name: string; size: number; game: string; updated: number };
const GANG_KEY = "hatch_gang_v1";

export default function GamesHubPage() {
  const [gangName, setGangName] = useState("");
  const [size, setSize] = useState(4);
  const [pick, setPick] = useState(GAMES[0].slug);
  const [saved, setSaved] = useState<Gang | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GANG_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);

  const chosen = useMemo(() => GAMES.find((g) => g.slug === pick) || GAMES[0], [pick]);

  function saveGang() {
    const g: Gang = {
      name: gangName.trim() || "Our squad",
      size: Math.max(2, Math.min(20, size)),
      game: pick,
      updated: Date.now(),
    };
    try {
      localStorage.setItem(GANG_KEY, JSON.stringify(g));
    } catch {}
    setSaved(g);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo" style={{ fontSize: 15, letterSpacing: "0.12em" }}>HATCH</div>
        <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>Offline games</span>
      </div>
      <div className="page stack">
        <h1 className="h1" style={{ fontSize: 26, marginBottom: 6 }}>Squad Games</h1>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
          Ten offline party games. No login. Works offline after load.
        </p>
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>Your gang tonight</div>
          <label className="label">Gang name</label>
          <input value={gangName} onChange={(e) => setGangName(e.target.value)} placeholder="Block A / Lab crew" />
          <label className="label">Players</label>
          <input type="number" min={2} max={20} value={size} onChange={(e) => setSize(Number(e.target.value) || 2)} />
          <label className="label">Game</label>
          <select value={pick} onChange={(e) => setPick(e.target.value as any)}>
            {GAMES.map((g) => (
              <option key={g.slug} value={g.slug}>{g.icon} {g.name}</option>
            ))}
          </select>
          <button type="button" className="btn" onClick={saveGang}>Save plan · {chosen.name}</button>
          {saved && (
            <div className="ok" style={{ fontSize: 13 }}>
              <strong>{saved.name}</strong> · {saved.size} players · {GAMES.find((g) => g.slug === saved.game)?.name}
            </div>
          )}
        </div>
        <div className="section-label">All 10 games</div>
        {GAMES.map((g) => (
          <Link key={g.slug} href={`/games/${g.slug}`} className="card" style={{ display: "block", marginBottom: 10, borderLeft: `3px solid ${g.accent}`, textDecoration: "none", color: "inherit" }}>
            <div className="row" style={{ gap: 12 }}>
              <span style={{ fontSize: 28 }}>{g.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 750 }}>{g.name}</div>
                <p className="muted" style={{ fontSize: 12 }}>{g.tagline}</p>
                <p className="muted" style={{ fontSize: 11 }}>{g.players} · {g.duration}</p>
              </div>
            </div>
          </Link>
        ))}
        <div style={{ height: 88 }} />
      </div>
      <Nav />
    </div>
  );
}
