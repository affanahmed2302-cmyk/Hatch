"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel, rateLimit } from "@/lib/supabase";
import { mutualCount, toggleSave, isSaved, haptic, playPing, bumpDaily } from "@/lib/obsession";
import {
  partitionConnections,
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
} from "@/lib/connections";
import { getBlockedIds } from "@/lib/safety";
import Nav from "@/components/Nav";

const DEPTS = ["All", "CSE", "ISE", "ECE", "EEE", "ME", "CV", "AIML", "AIDS", "Other"];
const YEARS_F = ["All", "1", "2", "3", "4"];

type Card = {
  id: string; full_name?: string; username?: string; bio?: string; department?: string;
  year?: number; avatar_url?: string; is_verified?: boolean; mutual?: number; saved?: boolean;
  skills?: string[]; intent?: string; career_goal?: string;
};

export default function DiscoverPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"discover" | "matches" | "requests">("discover");
  const [people, setPeople] = useState<Card[]>([]);
  const [matches, setMatches] = useState<Card[]>([]);
  const [requests, setRequests] = useState<Card[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [yearF, setYearF] = useState("All");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      await loadAll(user.id);
      setLoading(false);
    })();
  }, [router]);

  async function loadAll(uid: string) {
    const blocked = await getBlockedIds(uid);
    const { data: profs } = await supabase.from("profiles")
      .select("id, full_name, username, bio, department, year, avatar_url, is_verified, skills, intent, career_goal")
      .neq("id", uid).limit(80);
    const filtered = (profs || []).filter(p => !blocked.has(p.id));

    const { accepted: connectedIds, pendingIn, pendingOut } = await partitionConnections(uid);

    const cards: Card[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      if (connectedIds.has(p.id) || pendingOut.has(p.id)) continue;
      cards.push({
        ...p,
        skills: Array.isArray(p.skills) ? p.skills : [],
        mutual: i < 15 ? await mutualCount(uid, p.id) : 0,
        saved: await isSaved(uid, p.id),
      });
    }
    setPeople(cards);
    setMatches(filtered.filter(p => connectedIds.has(p.id)).map(p => ({ ...p, skills: Array.isArray(p.skills) ? p.skills : [] })));
    setRequests(filtered.filter(p => pendingIn.includes(p.id)).map(p => ({ ...p, skills: Array.isArray(p.skills) ? p.skills : [] })));
  }

  const visible = useMemo(() => {
    return people.filter((p) => {
      if (q) {
        const hay = `${p.full_name || ""} ${p.username || ""} ${(p.skills || []).join(" ")} ${p.bio || ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (dept !== "All" && (p.department || "") !== dept) return false;
      if (yearF !== "All" && String(p.year || "") !== yearF) return false;
      return true;
    });
  }, [people, q, dept, yearF]);

  async function connect(peerId: string) {
    if (!myId) return;
    if (!rateLimit("connect-" + peerId, 3000)) { setMsg("Wait a second…"); return; }
    const res = await sendConnectionRequest(myId, peerId);
    if (!res.ok) { setMsg(res.error || "Could not send"); return; }
    setMsg(res.status === "accepted" ? "Connected" : "Request sent");
    haptic(12); playPing();
    await bumpDaily(myId, "connects");
    await loadAll(myId);
  }

  async function accept(peerId: string) {
    if (!myId) return;
    const res = await acceptConnection(myId, peerId);
    if (!res.ok) setMsg(res.error || "Could not accept");
    else { setMsg("Connected!"); haptic([10, 30, 10]); await loadAll(myId); }
  }

  async function reject(peerId: string) {
    if (!myId) return;
    await rejectConnection(myId, peerId);
    setMsg("Declined");
    await loadAll(myId);
  }

  async function save(peerId: string) {
    if (!myId) return;
    const on = await toggleSave(myId, peerId);
    haptic(8);
    setPeople(prev => prev.map(p => p.id === peerId ? { ...p, saved: on } : p));
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">HATCH</div>
      </div>
      <div className="page">
        <div className="hero-card" style={{ marginBottom: 14 }}>
          <h1 className="h1" style={{ fontSize: 24, marginBottom: 6 }}>Find people</h1>
          <p className="muted" style={{ fontSize: 13 }}>Skills · teams · real campus connections</p>
          <div className="pill-row">
            <span className="pill hot">{visible.length} discover</span>
            <span className="pill">{matches.length} connected</span>
            {requests.length > 0 && <span className="pill">{requests.length} requests</span>}
          </div>
        </div>

        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {([["discover", "Discover"], ["matches", "Connected"], ["requests", "Requests"]] as const).map(([k, label]) => (
            <button key={k} type="button" className={tab === k ? "chip on" : "chip"} onClick={() => setTab(k)}>
              {label}{k === "requests" && requests.length > 0 ? ` (${requests.length})` : ""}
            </button>
          ))}
        </div>

        {tab === "discover" && (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, skill, bio…" style={{ marginBottom: 10 }} />
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {DEPTS.slice(0, 8).map((d) => (
                <button key={d} type="button" className={dept === d ? "chip on" : "chip"} style={{ fontSize: 11 }} onClick={() => setDept(d)}>{d}</button>
              ))}
            </div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {YEARS_F.map((y) => (
                <button key={y} type="button" className={yearF === y ? "chip on" : "chip"} style={{ fontSize: 11 }} onClick={() => setYearF(y)}>
                  {y === "All" ? "Year" : `Y${y}`}
                </button>
              ))}
            </div>

            {visible.map((p) => (
              <div key={p.id} className="card" style={{ marginBottom: 12 }}>
                <Link href={"/u/" + p.id} style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                    border: "2px solid var(--border)",
                    background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--lime-soft)",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{displayName(p)}</span>
                      {p.is_verified && <span className="badge">✓</span>}
                    </div>
                    <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {[p.department, p.year ? yearToLabel(p.year) : null].filter(Boolean).join(" · ") || "BMSCE"}
                    </p>
                    {p.intent && <span className="pill" style={{ marginTop: 6, display: "inline-block" }}>{p.intent}</span>}
                  </div>
                </Link>
                {p.bio && (
                  <p style={{ fontSize: 13, marginTop: 10, lineHeight: 1.4, opacity: 0.9 }}>
                    {p.bio.slice(0, 120)}{p.bio.length > 120 ? "…" : ""}
                  </p>
                )}
                {(p.skills || []).length > 0 && (
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {(p.skills || []).slice(0, 5).map((s) => (
                      <span key={s} className="chip" style={{ fontSize: 11 }}>{s}</span>
                    ))}
                  </div>
                )}
                <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-sm" onClick={() => connect(p.id)}>Connect</button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => save(p.id)}>{p.saved ? "Saved" : "Save"}</button>
                  <Link href={"/u/" + p.id} className="btn-ghost btn-sm">Profile</Link>
                  <Link href={"/chat/" + p.id} className="btn-ghost btn-sm">Message</Link>
                </div>
              </div>
            ))}
            {!visible.length && (
              <div className="empty">
                <p style={{ fontWeight: 700 }}>No one matches this filter</p>
                <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Try All departments or clear search</p>
              </div>
            )}
          </>
        )}

        {tab === "requests" && requests.map((p) => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <Link href={"/u/" + p.id} className="row" style={{ gap: 12, alignItems: "center", textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--lime-soft)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{displayName(p)}</div>
                <p className="muted" style={{ fontSize: 12 }}>Wants to connect</p>
              </div>
            </Link>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button type="button" className="btn btn-sm" onClick={() => accept(p.id)}>Accept</button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => reject(p.id)}>Decline</button>
            </div>
          </div>
        ))}

        {tab === "matches" && matches.map((p) => (
          <div key={p.id} className="card row" style={{ marginBottom: 10, gap: 12, alignItems: "center" }}>
            <Link href={"/u/" + p.id} style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--lime-soft)" }} />
              <div style={{ fontWeight: 800, fontSize: 15 }}>{displayName(p)}</div>
            </Link>
            <Link href={"/chat/" + p.id} className="btn btn-sm">Message</Link>
          </div>
        ))}

        {tab === "requests" && !requests.length && <div className="empty"><p>No requests yet</p></div>}
        {tab === "matches" && !matches.length && <div className="empty"><p>No connections yet — Discover someone</p></div>}
      </div>
      <Nav />
    </div>
  );
}
