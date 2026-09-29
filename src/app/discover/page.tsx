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
  const [tab, setTab] = useState<"discover" | "matches">("discover");
  const [people, setPeople] = useState<Card[]>([]);
  const [matches, setMatches] = useState<Card[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuId, setMenuId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      trackEvent(user.id, "discover_open");
      await loadPeople(user.id);
      await loadMatches(user.id);
      setLoading(false);
    })();
  }, [router]);

  async function loadPeople(uid: string) {
    const blocked = await getBlockedIds(uid);
    const { data } = await supabase.from("profiles")
      .select("id, full_name, username, bio, department, year, avatar_url, is_verified")
      .neq("id", uid).limit(50);
    const filtered = (data || []).filter(p => !blocked.has(p.id));
    const cards: Card[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      cards.push({ ...p, mutual: i < 15 ? await mutualCount(uid, p.id) : 0, saved: await isSaved(uid, p.id) });
    }
    setPeople(cards);
  }

  async function loadMatches(uid: string) {
    const blocked = await getBlockedIds(uid);
    const { data } = await supabase.from("connections").select("user_a, user_b, status")
      .eq("status", "accepted").or(`user_a.eq.${uid},user_b.eq.${uid}`);
    const ids = (data || []).map(c => c.user_a === uid ? c.user_b : c.user_a).filter(id => !blocked.has(id));
    if (!ids.length) { setMatches([]); return; }
    const { data: profs } = await supabase.from("profiles")
      .select("id, full_name, username, bio, department, year, avatar_url, is_verified").in("id", ids);
    setMatches(profs || []);
  }

  async function connect(peerId: string) {
    if (!myId) return;
    if (!rateLimit("connect-" + peerId, 3000)) { setMsg("Wait a second…"); return; }
    const [a, b] = myId < peerId ? [myId, peerId] : [peerId, myId];
    const { error } = await supabase.from("connections").upsert({
      user_a: a, user_b: b, status: "pending", requested_by: myId,
    }, { onConflict: "user_a,user_b" });
    if (error) setMsg(error.message);
    else {
      setMsg("Request sent");
      haptic(12); playPing();
      await bumpDaily(myId, "connects");
      trackEvent(myId, "connect_request", { peer: peerId });
      try { await supabase.rpc("bump_rep", { p_user: myId, p_amount: 1 }); } catch {}
    }
  }

  async function save(peerId: string) {
    if (!myId) return;
    const on = await toggleSave(myId, peerId);
    haptic(8);
    setPeople(prev => prev.map(p => p.id === peerId ? { ...p, saved: on } : p));
  }

  async function doBlock(peerId: string) {
    if (!myId) return;
    await blockUser(myId, peerId);
    setPeople(prev => prev.filter(p => p.id !== peerId));
    setMenuId(null);
    setMsg("User blocked");
  }

  async function doReport(peerId: string) {
    if (!myId) return;
    await reportUser(myId, peerId, "inappropriate");
    setMenuId(null);
    setMsg("Report submitted");
  }

  async function doClose(peerId: string) {
    if (!myId) return;
    const on = await toggleCloseFriend(myId, peerId);
    setMsg(on ? "Added to close friends" : "Removed from close friends");
    setMenuId(null);
  }

  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading...</span></div>;

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 12 }}>Connect</h1>
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button className={tab === "discover" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("discover")}>Discover</button>
          <button className={tab === "matches" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("matches")}>Matches</button>
          <Link href="/saved" className="btn-ghost btn-sm">Saved</Link>
        </div>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        {tab === "discover" && people.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }} onClick={() => myId && recordProfileView(myId, p.id)}>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)",
              }} />
              <div style={{ flex: 1 }}>
                <div className="h2" style={{ fontSize: 16 }}>{displayName(p)}{p.is_verified ? " ✓" : ""}</div>
                <p className="muted" style={{ fontSize: 12 }}>
                  {p.department}{p.year ? ` · ${yearToLabel(p.year)}` : ""}{p.mutual ? ` · ${p.mutual} mutual` : ""}
                </p>
              </div>
              <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setMenuId(menuId === p.id ? null : p.id); }}>···</button>
            </div>
            {menuId === p.id && (
              <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); doClose(p.id); }}>Close friend</button>
                <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); doReport(p.id); }}>Report</button>
                <button className="btn-ghost btn-sm" style={{ color: "#f43f5e" }} onClick={(e) => { e.stopPropagation(); doBlock(p.id); }}>Block</button>
              </div>
            )}
            {p.bio && <p style={{ fontSize: 13, marginTop: 8 }}>{p.bio.slice(0, 120)}</p>}
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); connect(p.id); }}>Connect</button>
              <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); save(p.id); }}>{p.saved ? "Saved" : "Save"}</button>
              <Link href={"/chat/" + p.id} className="btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>Chat</Link>
            </div>
          </div>
        ))}

        {tab === "matches" && matches.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)",
              }} />
              <div style={{ flex: 1 }}>
                <div className="h2" style={{ fontSize: 16 }}>{displayName(p)}{p.is_verified ? " ✓" : ""}</div>
                <p className="muted" style={{ fontSize: 12 }}>{p.department}</p>
              </div>
              <Link href={"/chat/" + p.id} className="btn btn-sm">Chat</Link>
            </div>
          </div>
        ))}

        {tab === "discover" && people.length === 0 && <div className="empty"><p>No one to discover yet</p></div>}
        {tab === "matches" && matches.length === 0 && <div className="empty"><p>No matches yet</p></div>}
      </div>
      <Nav />
    </div>
  );
}
