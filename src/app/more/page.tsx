"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isCirclesActive, isConfessionOpenNow } from "@/lib/features";
import Nav from "@/components/Nav";

const LINKS: { href: string; title: string; sub: string; group: string }[] = [
  { href: "/profile", title: "Your profile", sub: "Edit · photo · links", group: "You" },
  { href: "/settings", title: "Settings", sub: "Privacy · mode · PIN", group: "You" },
  { href: "/clubs", title: "Clubs", sub: "Directory · rank · events", group: "Campus" },
  { href: "/hostel", title: "Hostel life", sub: "Needs · hangouts · share", group: "Campus" },
  { href: "/confessions", title: "Confessions", sub: "Anonymous · scheduled window", group: "Campus" },
  { href: "/schedule", title: "Schedule", sub: "Classes · reminders", group: "Work" },
  { href: "/tools", title: "Opportunities", sub: "Internships · tools", group: "Work" },
  { href: "/teams", title: "Find a team", sub: "Hackathons · projects", group: "Work" },
  { href: "/radar", title: "Intent board", sub: "Who's up for code / food", group: "Campus" },
];

export default function MorePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [circles, setCircles] = useState(false);
  const [confessOpen, setConfessOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const [c, o] = await Promise.all([isCirclesActive(), isConfessionOpenNow()]);
      setCircles(c);
      setConfessOpen(o);
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  const groups = ["You", "Campus", "Work"];

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo" style={{ fontSize: 16 }}>
          More
        </div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.45 }}>
          Find your people. Build something together.
        </p>

        {circles && (
          <Link
            href="/sparks"
            className="card"
            style={{
              display: "block",
              marginBottom: 12,
              textDecoration: "none",
              color: "inherit",
              border: "1px solid rgba(167,139,250,0.4)",
            }}
          >
            <div style={{ fontWeight: 800 }}>◎ Campus Circles</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Meet classmates for projects, fests &amp; study groups
            </p>
          </Link>
        )}

        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 16 }}>
            <div className="section-label">{g}</div>
            {LINKS.filter((l) => l.group === g).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="card"
                style={{
                  display: "block",
                  marginBottom: 8,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {l.title}
                  {l.href === "/confessions" && confessOpen ? " · open" : ""}
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {l.sub}
                </p>
              </Link>
            ))}
          </div>
        ))}

        <div style={{ height: 88 }} />
      </div>
      <Nav />
    </div>
  );
}
