"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import { shareInvite } from "@/lib/invite";
import Nav from "@/components/Nav";

const CORE = [
  { href: "/hostel", title: "Hatch Hostel", blurb: "Your hostel life, sorted — needs, market, tips" },
  { href: "/sparks", title: "Campus Sparks", blurb: "Dating prefs · same Hatch profile" },
  { href: "/teams", title: "Teams", blurb: "Hackathon & project teammates" },
  { href: "/clubs", title: "Clubs", blurb: "Boards, notices, events" },
  { href: "/challenges", title: "Challenges", blurb: "Daily campus missions" },
  { href: "/leaderboard", title: "Leaderboard", blurb: "Rep ranks" },
  { href: "/premium", title: "Premium", blurb: "Unlock extra perks" },
];

const EXTRA = [
  { href: "/radar", title: "Radar", blurb: "Nearby intents" },
  { href: "/ghost", title: "Ghost Teammate", blurb: "Squad suggestions" },
  { href: "/legends", title: "Legends", blurb: "Invite-only circle" },
  { href: "/install", title: "Install app", blurb: "Add to home screen" },
];

export default function ExplorePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [shareMsg, setShareMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setEmail(user.email || "");
      setLoading(false);
    })();
  }, [router]);

  async function invite() {
    const r = await shareInvite();
    if (r.ok && r.method === "clipboard") setShareMsg("Invite link copied");
    else if (r.ok) setShareMsg("Share sheet opened");
    else if ("url" in r) setShareMsg(r.url);
  }

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
        <div className="logo" style={{ fontSize: 16 }}>Explore</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Tools beyond Home — keep it simple</p>
        <button type="button" className="btn" style={{ width: "100%", marginBottom: 16 }} onClick={invite}>Invite a classmate</button>
        {shareMsg && <div className="ok" style={{ marginBottom: 12 }}>{shareMsg}</div>}
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, opacity: 0.7 }}>MAIN</div>
        {CORE.map((x) => (
          <Link key={x.href} href={x.href} className="card" style={{ display: "block", marginBottom: 10, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontWeight: 800 }}>{x.title}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{x.blurb}</p>
          </Link>
        ))}
        <div style={{ fontWeight: 700, fontSize: 12, margin: "16px 0 8px", opacity: 0.7 }}>MORE</div>
        {EXTRA.map((x) => (
          <Link key={x.href} href={x.href} className="card" style={{ display: "block", marginBottom: 10, textDecoration: "none", color: "inherit", opacity: 0.92 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{x.title}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{x.blurb}</p>
          </Link>
        ))}
        {isSuperAdmin(email) && (
          <Link href="/pilot" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 12 }}>Pilot console</Link>
        )}
      </div>
      <Nav />
    </div>
  );
}
