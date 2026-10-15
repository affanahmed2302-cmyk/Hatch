"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import { getFeatureFlags } from "@/lib/features";
import { shareInvite } from "@/lib/invite";
import Nav from "@/components/Nav";

type Tool = {
  href: string;
  title: string;
  blurb: string;
  emoji: string;
  flag?: string | null;
  group: "daily" | "campus" | "career" | "safety" | "social";
};

/** All campus tools in one place — researched for BMSCE daily life */
const TOOLS: Tool[] = [
  // Daily
  { href: "/schedule", title: "Schedule Planner", blurb: "Classes · goals · 10-min reminders · .ics / Google Calendar", emoji: "📅", group: "daily" },
  { href: "/home", title: "I'm Free", blurb: "Library · Canteen · Arch Park · Ground · Back Benches", emoji: "🟢", group: "daily" },
  { href: "/lounge", title: "Campus Lounge", blurb: "General + Anonymous chat · consent · filter · ban", emoji: "◈", group: "daily" },
  { href: "/hostel", title: "Hostel Hub", blurb: "Needs · market · tips · roommate context", emoji: "🏠", group: "daily" },
  { href: "/radar", title: "Campus Radar", blurb: "Nearby intents · who is free near you", emoji: "📡", group: "daily" },
  // Campus
  { href: "/clubs", title: "Clubs & Events", blurb: "60+ clubs · boards · notices · RSVP", emoji: "✦", group: "campus" },
  { href: "/challenges", title: "Daily Challenges", blurb: "Campus missions · streaks · rep", emoji: "🎯", group: "campus" },
  { href: "/ghost", title: "Ghost Teammate", blurb: "Squad suggestions for projects & labs", emoji: "👻", group: "campus" },
  { href: "/teams", title: "Teams", blurb: "Hackathon & project teammates", emoji: "🤝", group: "campus" },
  { href: "/opportunities", title: "Opportunities", blurb: "Internships · links · curated for BMSCE", emoji: "💼", group: "career" },
  { href: "/leaderboard", title: "Leadership Board", blurb: "Skills · OSS · internships · usage · GitHub/LinkedIn", emoji: "🏆", group: "career" },
  { href: "/coach", title: "Career Coach", blurb: "Profile tips · placement readiness", emoji: "🧭", group: "career" },
  { href: "/discover", title: "Find People", blurb: "Skills · teams · study partners", emoji: "◎", group: "social" },
  { href: "/inbox", title: "Messages", blurb: "DMs · context from Pulse & Free", emoji: "◇", group: "social" },
  { href: "/install", title: "Install PWA", blurb: "Add Hatch to home screen · offline shell", emoji: "📲", group: "daily" },
  { href: "/safety", title: "Campus Safety", blurb: "Emergency contacts · security · health centre", emoji: "🛡️", group: "safety" },
  { href: "/lost-found", title: "Lost & Found", blurb: "Post lost IDs, bottles, keys on campus", emoji: "🔎", group: "campus" },
  { href: "/mess", title: "Mess & Canteen", blurb: "Timing tips · popular spots · food runs", emoji: "🍽️", group: "daily" },
  { href: "/exams", title: "Exam Countdown", blurb: "Track internals · deadlines · focus blocks", emoji: "📚", group: "daily" },
  { href: "/notes", title: "Peer Notes", blurb: "Share links to notes · lab manuals · resources", emoji: "📝", group: "campus" },
];

const GROUP_LABEL: Record<Tool["group"], string> = {
  daily: "Daily campus",
  campus: "Campus life",
  career: "Career & growth",
  safety: "Safety",
  social: "People",
};

export default function ToolsPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [shareMsg, setShareMsg] = useState("");
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setEmail(user.email || "");
      setFlags(await getFeatureFlags());
      setLoading(false);
    })();
  }, [router]);

  async function invite() {
    const r = await shareInvite();
    if (r.ok && r.method === "clipboard") setShareMsg("Invite link copied");
    else if (r.ok) setShareMsg("Share sheet opened");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading tools…</span>
      </div>
    );
  }

  const filtered = TOOLS.filter((t) => {
    if (t.flag && !flags[t.flag]) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return t.title.toLowerCase().includes(s) || t.blurb.toLowerCase().includes(s);
  });

  const groups = (Object.keys(GROUP_LABEL) as Tool["group"][]).filter((g) =>
    filtered.some((t) => t.group === g)
  );

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Campus Tools</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Everything useful for BMSCE — study, food, hostel, career, safety.
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools…"
          maxLength={60}
          style={{ marginBottom: 12 }}
        />
        <button type="button" className="btn" style={{ width: "100%", marginBottom: 14 }} onClick={invite}>
          Invite a classmate
        </button>
        {shareMsg && <div className="ok" style={{ marginBottom: 10 }}>{shareMsg}</div>}

        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, opacity: 0.75, letterSpacing: 0.4 }}>
              {GROUP_LABEL[g].toUpperCase()}
            </div>
            {filtered.filter((t) => t.group === g).map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="card"
                style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, textDecoration: "none", color: "inherit" }}
              >
                <span style={{ fontSize: 22, width: 36, textAlign: "center" }}>{t.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{t.title}</div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{t.blurb}</p>
                </div>
              </Link>
            ))}
          </div>
        ))}

        {!filtered.length && <div className="empty"><p>No tools match</p></div>}

        {isSuperAdmin(email) && (
          <Link href="/pilot" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 8 }}>
            Pilot console
          </Link>
        )}
      </div>
      <Nav />
    </div>
  );
}
