"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel, rateLimit } from "@/lib/supabase";
import { mutualCount, toggleSave, isSaved, haptic, playPing, bumpDaily } from "@/lib/obsession";
import { getBlockedIds } from "@/lib/safety";
import Nav from "@/components/Nav";

const DEPTS = ["All", "CSE", "ISE", "ECE", "EEE", "ME", "CV", "AIML", "AIDS", "Other"];

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

    const { data: cons } = await supabase.from("connections")
      .select("id, user_id, target_id, status")
      .or(`user_id.eq.${uid},target_id.eq.${uid}`);

    const connectedIds = new Set<string>();
    const pendingIn: string[] = [];
    const pendingOut = new Set<string>();

    for (const c of cons || []) {
      const peer = c.user_id === uid ? c.target_id : c.user_id;
      if (c.status === "accepted") connectedIds.add(peer);
      else if (c.status === "pending") {
        if (c.target_id === uid) pendingIn.push(c.user_id);
        else pendingOut.add(c.target_id);
      }
    }

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

    if (pendingIn.length) {
      const { data: rp } = await supabase.from("profiles")
        .select("id, full_name, username, bio, department, year, avatar_url, is_verified, skills")
        .in("id", pendingIn);
      setRequests((rp || []).map(p => ({ ...p, skills: Array.isArray(p.skills) ? p.skills : [] })));
    } else setRequests([]);
  }

  const visible = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return people.filter(p => {
      if (dept !== "All" && (p.department || "") !== dept) return false;
      if (!qq) return true;
      const hay = [p.full_name, p.username, p.bio, p.department, p.intent, p.career_goal, ...(p.skills || [])]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(qq);
    });
  }, [people, q, dept]);

  async function connect(peerId: string) {
    if (!myId) return;
    if (!rateLimit("connect-" + peerId, 3000)) { setMsg("Wait a second…"); return; }
    const { error } = await supabase.from("connections").insert({
      user_id: myId, target_id: peerId, status: "pending",
    });
    if (error) {
      if ((error.message || "").includes("duplicate") || error.code === "23505") setMsg("Already requested");
      else setMsg(error.message);
    } else {
      setMsg("Request sent");
      haptic(12); playPing();
      await bumpDaily(myId, "connects");
      await loadAll(myId);
    }
  }

  async function accept(peerId: string) {
    if (!myId) return;
    const { error } = await supabase.from("connections")
      .update({ status: "accepted" })
      .eq("user_id", peerId).eq("target_id", myId).eq("status", "pending");
    if (error) setMsg(error.message);
    else { setMsg("Connected!"); haptic([10, 30, 10]); await loadAll(myId); }
  }

  async function reject(peerId: string) {
    if (!myId) return;
    await supabase.from("connections")
      .update({ status: "rejected" })
      .eq("user_id", peerId).eq("target_id", myId).eq("status", "pending");
    setMsg("Declined");
    await loadAll(myId);
  }

  async function save(peerId: string) {
    if (!myId) return;
    const on = await toggleSave(myId, peerId);
    haptic(8);
    setPeople(prev => prev.map(p => p.id === peerId ? { ...p, saved: on } : p));
  }

  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading...</span></div>;

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 12 }}>Connect</h1>
        <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button className={tab === "discover" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("discover")}>Discover ({visible.length})</button>
          <button className={tab === "requests" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("requests")}>Requests ({requests.length})</button>
          <button className={tab === "matches" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("matches")}>Connected ({matches.length})</button>
        </div>

        {tab === "discover" && (
          <>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search name, skill, branch…"
              style={{ marginBottom: 10, borderRadius: 14 }}
            />
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {DEPTS.map(d => (
                <button key={d} className={dept === d ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setDept(d)}>{d}</button>
              ))}
            </div>
          </>
        )}

        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        {tab === "discover" && visible.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <Link href={"/u/" + p.id} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="row" style={{ gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)",
                }} />
                <div style={{ flex: 1 }}>
                  <div className="h2" style={{ fontSize: 16 }}>{displayName(p)}{p.is_verified ? " ✓" : ""}</div>
                  <p className="muted" style={{ fontSize: 12 }}>
                    {p.department}{p.year ? ` · ${yearToLabel(p.year)}` : ""}{p.mutual ? ` · ${p.mutual} mutual` : ""}
                  </p>
                </div>
              </div>
              {p.bio && <p style={{ fontSize: 13, marginTop: 8 }}>{p.bio.slice(0, 120)}</p>}
              {p.intent && <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Looking for · {p.intent}</p>}
            </Link>
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button className="btn btn-sm" onClick={() => connect(p.id)}>Connect</button>
              <button className="btn-ghost btn-sm" onClick={() => save(p.id)}>{p.saved ? "Saved" : "Save"}</button>
              <Link href={"/u/" + p.id} className="btn-ghost btn-sm">Profile</Link>
              <Link href={"/chat/" + p.id} className="btn-ghost btn-sm">Message</Link>
            </div>
          </div>
        ))}

        {tab === "requests" && requests.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <Link href={"/u/" + p.id} className="row" style={{ gap: 12, alignItems: "center", textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)" }} />
              <div style={{ flex: 1 }}>
                <div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div>
                <p className="muted" style={{ fontSize: 12 }}>Wants to connect</p>
              </div>
            </Link>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button className="btn btn-sm" onClick={() => accept(p.id)}>Accept</button>
              <button className="btn-ghost btn-sm" onClick={() => reject(p.id)}>Decline</button>
            </div>
          </div>
        ))}

        {tab === "matches" && matches.map(p => (
          <div key={p.id} className="card row" style={{ marginBottom: 10, gap: 12, alignItems: "center" }}>
            <Link href={"/u/" + p.id} style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)" }} />
              <div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div>
            </Link>
            <Link href={"/chat/" + p.id} className="btn btn-sm">Message</Link>
          </div>
        ))}

        {tab === "discover" && !visible.length && <div className="empty"><p>No matches for this filter</p></div>}
        {tab === "requests" && !requests.length && <div className="empty"><p>No requests</p></div>}
        {tab === "matches" && !matches.length && <div className="empty"><p>No connections yet</p></div>}
      </div>
      <Nav />
    </div>
  );
}
