"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, postPulse } from "@/lib/supabase";
import Nav from "@/components/Nav";

const ACTIONS = [
  { href: "/home", title: "Campus pulse", sub: "Share a short campus update", tag: "Feed" },
  { href: "/teams", title: "Find a team", sub: "Hackathon or project teammates", tag: "Collaborate" },
  { href: "/clubs", title: "Clubs & circles", sub: "Browse communities on campus", tag: "Circles" },
  { href: "/radar", title: "Campus radar", sub: "Events, intents, who is up for what", tag: "Events" },
  { href: "/opportunities", title: "Opportunity", sub: "Internships and openings board", tag: "Career" },
  { href: "/more", title: "More tools", sub: "Hostel, schedule, confessions, settings", tag: "Tools" },
];

export default function CreatePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
    })();
  }, [router]);

  async function publish() {
    if (!userId || !text.trim()) return;
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const res = await postPulse(userId, text.trim());
      if (!res.ok) setErr(res.error || "Could not post");
      else {
        setText("");
        setMsg("Posted to campus pulse");
        setTimeout(() => router.push("/home"), 600);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed");
    }
    setLoading(false);
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">CREATE</div></div>
      <div className="page stack">
        <div>
          <h1 className="h1" style={{ fontSize: 24, marginBottom: 6 }}>Create</h1>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>
            Share something useful with campus — or jump into a collaboration flow.
          </p>
        </div>
        <div className="card stack">
          <div style={{ fontWeight: 700, fontSize: 15 }}>Quick pulse</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What is happening on campus?" maxLength={200} rows={3} aria-label="Pulse text" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted" style={{ fontSize: 12 }}>{text.length}/200</span>
            <button type="button" className="btn btn-sm" disabled={!text.trim() || loading} onClick={publish}>
              {loading ? "Posting…" : "Post"}
            </button>
          </div>
          {msg && <div className="ok">{msg}</div>}
          {err && <div className="fail">{err}</div>}
        </div>
        <div className="section-label">Other create paths</div>
        {ACTIONS.map((a) => (
          <Link key={a.href + a.title} href={a.href} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{a.title}</div>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{a.sub}</p>
              </div>
              <span className="badge">{a.tag}</span>
            </div>
          </Link>
        ))}
      </div>
      <Nav />
    </div>
  );
}
