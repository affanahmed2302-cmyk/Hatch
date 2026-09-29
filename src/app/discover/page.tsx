"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel, rateLimit } from "@/lib/supabase";
import { mutualCount, toggleSave, isSaved, recordProfileView, haptic, playPing, bumpDaily } from "@/lib/obsession";
import { getBlockedIds, blockUser, reportUser, toggleCloseFriend, trackEvent } from "@/lib/safety";
import Nav from "@/components/Nav";

type Card = {
  id: string; full_name?: string; username?: string; bio?: string; department?: string;
  year?: number; avatar_url?: string; is_verified?: boolean; mutual?: number; saved?: boolean;
};

export default function DiscoverPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"discover" | "matches" | "requests">("discover");
  const [people, setPeople] = useState<Card[]>([]);
  const [matches, setMatches] = useState<Card[]>([]);
  const [requests, setRequests] = useState<Card[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuId, setMenuId] = useState<string | null>(null);
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
      .select("id, full_name, username, bio, department, year, avatar_url, is_verified")
      .neq("id", uid).limit(50);
    const filtered = (profs || []).filter(p => !blocked.has(p.id));

    const { data: cons } = await supabase.from("connections")
      .select("id, user_id, target_id, status")
      .or(`user_id.eq.${uid},target_id.eq.${uid}`);

    const connectedIds = new Set<string>();
    const pendingIn: string[] = [];

    for (const c of cons || []) {
      const peer = c.user_id === uid ? c.target_id : c.user_id;
      if (c.status === "accepted") connectedIds.add(peer);
      else if (c.status === "pending" && c.target_id === uid) pendingIn.push(c.user_id);
    }

    const cards: Card[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      if (connectedIds.has(p.id)) continue;
      cards.push({
        ...p,
        mutual: i < 12 ? await mutualCount(uid, p.id) : 0,
        saved: await isSaved(uid, p.id),
      });
    }
    setPeople(cards);
    setMatches(filtered.filter(p => connectedIds.has(p.id)));

    if (pendingIn.length) {
      const { data: rp } = await supabase.from("profiles")
        .select("id, full_name, username, bio, department, year, avatar_url, is_verified")
        .in("id", pendingIn);
      setRequests(rp || []);
    } else setRequests([]);
  }

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
        <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button className={tab === "discover" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("discover")}>Discover ({people.length})</button>
          <button className={tab === "requests" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("requests")}>Requests ({requests.length})</button>
          <button className={tab === "matches" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("matches")}>Connected ({matches.length})</button>
        </div>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        {tab === "discover" && people.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)",
              }} />
              <div style={{ flex: 1 }}>
                <div className="h2" style={{ fontSize: 16 }}>{displayName(p)}</div>
                <p className="muted" style={{ fontSize: 12 }}>{p.department}{p.year ? ` · ${yearToLabel(p.year)}` : ""}</p>
              </div>
            </div>
            {p.bio && <p style={{ fontSize: 13, marginTop: 8 }}>{p.bio.slice(0, 120)}</p>}
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button className="btn btn-sm" onClick={() => connect(p.id)}>Connect</button>
              <button className="btn-ghost btn-sm" onClick={() => save(p.id)}>{p.saved ? "Saved" : "Save"}</button>
              <Link href={"/chat/" + p.id} className="btn-ghost btn-sm">Message</Link>
            </div>
          </div>
        ))}

        {tab === "requests" && requests.map(p => (
          <div key={p.id} className="card row" style={{ marginBottom: 10, gap: 12, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)" }} />
            <div style={{ flex: 1 }}><div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div></div>
            <button className="btn btn-sm" onClick={() => accept(p.id)}>Accept</button>
          </div>
        ))}

        {tab === "matches" && matches.map(p => (
          <div key={p.id} className="card row" style={{ marginBottom: 10, gap: 12, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)" }} />
            <div style={{ flex: 1 }}><div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div></div>
            <Link href={"/chat/" + p.id} className="btn btn-sm">Message</Link>
          </div>
        ))}

        {tab === "discover" && !people.length && <div className="empty"><p>No one to discover</p></div>}
        {tab === "requests" && !requests.length && <div className="empty"><p>No requests</p></div>}
        {tab === "matches" && !matches.length && <div className="empty"><p>No connections yet</p></div>}
      </div>
      <Nav />
    </div>
  );
}
