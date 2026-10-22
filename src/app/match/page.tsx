"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel } from "@/lib/supabase";
import { fetchSkillMatches, type MatchCandidate } from "@/lib/match";
import { sendConnectionRequest } from "@/lib/connections";
import Avatar from "@/components/Avatar";
import Nav from "@/components/Nav";

export default function MatchPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [list, setList] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      try {
        const raw = sessionStorage.getItem("hatch_match_dismiss");
        if (raw) setDismissed(new Set(JSON.parse(raw)));
      } catch {}
      const rows = await fetchSkillMatches(user.id, 30);
      setList(rows);
      setLoading(false);
    })();
  }, [router]);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try { sessionStorage.setItem("hatch_match_dismiss", JSON.stringify([...next])); } catch {}
  }

  async function connect(id: string) {
    if (!myId) return;
    const res = await sendConnectionRequest(myId, id);
    setMsg(res.ok ? (res.status === "accepted" ? "Connected" : "Request sent") : res.error || "Failed");
    if (res.ok) dismiss(id);
  }

  const visible = list.filter((c) => !dismissed.has(c.id));

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">Match</div>
        <Link href="/discover" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>Discover</Link>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.45 }}>
          Suggestions use skills, intent, and goals — reasons are shown so you know why someone appears.
        </p>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {loading && <div className="muted">Finding collaborators…</div>}
        {!loading && !visible.length && (
          <div className="empty">
            <p style={{ fontWeight: 700 }}>No matches yet</p>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Add skills on your profile so recommendations improve.</p>
            <Link href="/profile" className="btn" style={{ marginTop: 12, display: "inline-block" }}>Edit profile</Link>
          </div>
        )}
        {visible.map((c) => (
          <div key={c.id} className="card" style={{ marginBottom: 12 }}>
            <Link href={"/u/" + c.id} style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", color: "inherit" }}>
              <Avatar profile={c} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>{displayName(c)}</div>
                <p className="muted" style={{ fontSize: 12 }}>
                  {[c.department, c.year != null ? yearToLabel(c.year) : null].filter(Boolean).join(" · ") || "BMSCE"}
                </p>
              </div>
            </Link>
            {(c.skills || []).length > 0 && (
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {c.skills!.slice(0, 6).map((s) => (
                  <span key={s} className="chip" style={{ fontSize: 11 }}>{s}</span>
                ))}
              </div>
            )}
            <ul className="muted" style={{ fontSize: 12, marginTop: 10, paddingLeft: 18, lineHeight: 1.45 }}>
              {c.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-sm" onClick={() => connect(c.id)}>Connect</button>
              <Link href={"/u/" + c.id} className="btn-ghost btn-sm">Profile</Link>
              <Link href={"/chat/" + c.id} className="btn-ghost btn-sm">Message</Link>
              <button type="button" className="btn-ghost btn-sm" onClick={() => dismiss(c.id)}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
      <Nav />
    </div>
  );
}
