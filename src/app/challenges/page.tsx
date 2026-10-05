"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";

type Challenge = {
  id: string;
  emoji: string;
  title: string;
  blurb: string;
  href: string;
  cta: string;
  points: number;
};

const DAILY: Challenge[] = [
  {
    id: "free",
    emoji: "🟢",
    title: "Go Free Now",
    blurb: "Mark yourself at Library / Nescafe / Quad so others can ping you.",
    href: "/home",
    cta: "I'm free",
    points: 10,
  },
  {
    id: "pulse",
    emoji: "⚡",
    title: "Drop a Pulse",
    blurb: "Post one campus update — win the feed for 15 minutes.",
    href: "/home",
    cta: "Post pulse",
    points: 10,
  },
  {
    id: "people",
    emoji: "◎",
    title: "Find 3 people",
    blurb: "Open Discover and view three profiles with matching skills.",
    href: "/discover",
    cta: "Discover",
    points: 15,
  },
  {
    id: "lounge",
    emoji: "◈",
    title: "Lounge intro",
    blurb: "Say hi in Lounge — keep it useful (project / notes / club).",
    href: "/lounge",
    cta: "Open Lounge",
    points: 10,
  },
  {
    id: "sparks",
    emoji: "✨",
    title: "Sparks profile",
    blurb: "Complete Campus Sparks consent + profile (optional, free at launch).",
    href: "/sparks/me",
    cta: "Sparks",
    points: 20,
  },
  {
    id: "team",
    emoji: "🛠",
    title: "Team intent",
    blurb: "Post or join a teammate request for a hackathon / project.",
    href: "/teams",
    cta: "Teams",
    points: 20,
  },
  {
    id: "radar",
    emoji: "📡",
    title: "Radar pulse",
    blurb: "Set a nearby intent on Quantum Radar (coffee / coding / walk).",
    href: "/radar",
    cta: "Radar",
    points: 15,
  },
  {
    id: "ghost",
    emoji: "👻",
    title: "Ghost Teammate",
    blurb: "Run AI squad match once — save a suggested teammate.",
    href: "/ghost",
    cta: "Ghost",
    points: 15,
  },
];

const KEY = "hatch_challenges_v1";

export default function ChallengesPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const raw = localStorage.getItem(KEY + "_" + user.id);
        if (raw) setDone(JSON.parse(raw));
      } catch { /* */ }
      setLoading(false);
    })();
  }, [router]);

  function mark(id: string) {
    setDone((prev) => {
      const next = { ...prev, [id]: true };
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          try {
            localStorage.setItem(KEY + "_" + data.user.id, JSON.stringify(next));
          } catch { /* */ }
        }
      });
      return next;
    });
  }

  const score = DAILY.filter((c) => done[c.id]).reduce((s, c) => s + c.points, 0);
  const total = DAILY.reduce((s, c) => s + c.points, 0);

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Challenges</div>
      </div>
      <div className="page">
        <div className="hero-card" style={{ marginBottom: 14 }}>
          <h1 className="h1" style={{ fontSize: 22, marginBottom: 6, position: "relative", zIndex: 1 }}>
            Campus Challenges
          </h1>
          <p className="muted" style={{ fontSize: 13, position: "relative", zIndex: 1 }}>
            Daily missions · earn campus points · stay active
          </p>
          <div className="pill-row" style={{ position: "relative", zIndex: 1 }}>
            <span className="pill hot">{score} / {total} pts</span>
            <span className="pill">{Object.keys(done).filter((k) => done[k]).length} done</span>
          </div>
        </div>

        {DAILY.map((c) => (
          <div
            key={c.id}
            className="card"
            style={{
              marginBottom: 10,
              opacity: done[c.id] ? 0.7 : 1,
              borderColor: done[c.id] ? "rgba(52,211,153,0.35)" : undefined,
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  {c.emoji} {c.title}
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{c.blurb}</p>
                <span className="badge" style={{ marginTop: 8, display: "inline-block" }}>
                  +{c.points} pts
                </span>
              </div>
              {done[c.id] ? (
                <span className="badge" style={{ background: "#10b981", color: "#fff" }}>Done</span>
              ) : (
                <div className="stack" style={{ gap: 6 }}>
                  <Link href={c.href} className="btn btn-sm" onClick={() => mark(c.id)}>
                    {c.cta}
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}

        <p className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 8 }}>
          Progress saves on this device · more challenges weekly
        </p>
      </div>
      <Nav />
    </div>
  );
}
