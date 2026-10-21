"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isCirclesActive, isConfessionOpenNow } from "@/lib/features";
import Nav from "@/components/Nav";

type LinkItem = { href: string; title: string; sub: string; group: string };

const LINKS: LinkItem[] = [
  { href: "/settings", title: "Settings", sub: "Privacy · notifications · theme", group: "You" },
  { href: "/saved", title: "Saved", sub: "Bookmarks and saved items", group: "You" },
  { href: "/clubs", title: "Circles & clubs", sub: "Directory · events · membership", group: "Campus" },
  { href: "/hostel", title: "Hostel Hub", sub: "Needs · notices · share", group: "Campus" },
  { href: "/confessions", title: "Confessions", sub: "Anonymous · windowed · reportable", group: "Campus" },
  { href: "/radar", title: "Campus Radar", sub: "Events · intents · who is up", group: "Campus" },
  { href: "/lost-found", title: "Lost & found", sub: "Campus items board", group: "Campus" },
  { href: "/schedule", title: "Timetable", sub: "Classes · reminders", group: "Tools" },
  { href: "/notes", title: "Notes", sub: "Shared resources when available", group: "Tools" },
  { href: "/opportunities", title: "Opportunities", sub: "Internships · openings", group: "Tools" },
  { href: "/teams", title: "Find a team", sub: "Hackathons · projects", group: "Tools" },
  { href: "/leaderboard", title: "Leaderboard", sub: "Campus reputation signals", group: "Tools" },
  { href: "/safety", title: "Safety", sub: "Report · block · guidelines", group: "Trust" },
  { href: "/install", title: "Install app", sub: "Add Hatch to your home screen", group: "Trust" },
];

export default function MorePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [circles, setCircles] = useState(false);
  const [confessOpen, setConfessOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      try {
        const [c, o] = await Promise.all([isCirclesActive(), isConfessionOpenNow()]);
        setCircles(c);
        setConfessOpen(o);
      } catch {}
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="shell">
        <div className="page">
          <div className="skel skel-hero" />
          <div className="skel skel-card" />
        </div>
      </div>
    );
  }

  const groups = ["You", "Campus", "Tools", "Trust"];

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">MORE</div></div>
      <div className="page">
        <p className="muted" style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
          Campus tools and communities. Primary nav: Home · Discover · Create · Inbox · Profile.
        </p>
        {circles && (
          <Link href="/sparks" className="card" style={{ display: "block", marginBottom: 12, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontWeight: 700 }}>Circles</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Feature flag enabled</p>
          </Link>
        )}
        {confessOpen && (
          <Link href="/confessions" className="card" style={{ display: "block", marginBottom: 12, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontWeight: 700 }}>Confessions window is open</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Guidelines · report abuse</p>
          </Link>
        )}
        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 18 }}>
            <div className="section-label">{g}</div>
            <div className="stack" style={{ gap: 8 }}>
              {LINKS.filter((l) => l.group === g).map((l) => (
                <Link key={l.href} href={l.href} className="card" style={{ display: "block", textDecoration: "none", color: "inherit", padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{l.title}</div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 3 }}>{l.sub}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Nav />
    </div>
  );
}
