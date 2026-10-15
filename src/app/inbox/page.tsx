"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, isRecentlyOnline, touchPresence } from "@/lib/supabase";
import { hasChatLock, isChatUnlocked, unlockChat, isChatLocked } from "@/lib/chatLock";
import { fetchActiveIncoming, respondCall, callEmbedUrl, type CallRow } from "@/lib/calls";
import { getPinned } from "@/lib/pins";
import Nav from "@/components/Nav";

type Thread = { peerId: string; profile: any; last: any; locked: boolean; unread: number; pinned: boolean };

export default function InboxPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState("Hatch");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [needPin, setNeedPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [folderOpen, setFolderOpen] = useState(false);
  const [incoming, setIncoming] = useState<CallRow | null>(null);
  const [callUrl, setCallUrl] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      touchPresence(user.id);
      const { data: me } = await supabase.from("profiles").select("full_name, username, email").eq("id", user.id).maybeSingle();
      setMyName(displayName(me || {}) || "Hatch");
      if (hasChatLock() && !isChatUnlocked()) { setNeedPin(true); setLoading(false); return; }
      await loadThreads(user.id);
      const inc = await fetchActiveIncoming(user.id);
      if (inc) setIncoming(inc);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel("inbox-calls-" + myId)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, async () => {
        setIncoming(await fetchActiveIncoming(myId));
      }).subscribe();
    const t = setInterval(() => touchPresence(myId), 60000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [myId]);

  async function loadThreads(uid: string) {
    try {
      const { data: msgs } = await supabase.from("messages")
        .select("id, sender_id, receiver_id, content, created_at, read_at")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order("created_at", { ascending: false }).limit(150);
      const map = new Map<string, any>();
      const unreadMap = new Map<string, number>();
      for (const m of msgs || []) {
        const peer = m.sender_id === uid ? m.receiver_id : m.sender_id;
        if (!map.has(peer)) map.set(peer, m);
        if (m.receiver_id === uid && !m.read_at) {
          unreadMap.set(peer, (unreadMap.get(peer) || 0) + 1);
        }
      }
      const peerIds = [...map.keys()];
      if (!peerIds.length) { setThreads([]); return; }
      // Include email so displayName can fall back to a real-looking name
      const { data: profs } = await supabase.from("profiles")
        .select("id, full_name, username, email, avatar_url, last_seen, department").in("id", peerIds);
      const byId = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
      const pinnedSet = new Set(getPinned());
      const list = peerIds.map((id) => ({
        peerId: id,
        profile: byId[id] || {},
        last: map.get(id),
        locked: isChatLocked(id),
        unread: unreadMap.get(id) || 0,
        pinned: pinnedSet.has(id),
      }));
      list.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return 0;
      });
      setThreads(list);
    } catch { setThreads([]); }
  }

  function tryUnlock() {
    if (unlockChat(pin)) {
      setNeedPin(false); setLoading(true);
      if (myId) loadThreads(myId).then(() => setLoading(false));
    } else setPinErr("Wrong PIN");
  }

  async function acceptCall() {
    if (!incoming) return;
    const res = await respondCall(incoming.id, true);
    if (res.ok && res.call) { setIncoming(null); setCallUrl(callEmbedUrl(res.call, myName)); }
  }
  async function declineCall() {
    if (!incoming) return;
    await respondCall(incoming.id, false);
    setIncoming(null);
  }

  function timeAgo(iso?: string) {
    if (!iso) return "";
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  }

  if (needPin) {
    return (
      <div className="shell" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
          <h1 className="h1" style={{ marginBottom: 8 }}>Locked inbox</h1>
          <p className="muted" style={{ fontSize: 13 }}>Enter PIN once · stays open this session</p>
        </div>
        {pinErr && <div className="fail" style={{ marginBottom: 8 }}>{pinErr}</div>}
        <input type="password" inputMode="numeric" placeholder="••••" value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ marginBottom: 12, textAlign: "center", fontSize: 22, letterSpacing: 8 }} />
        <button className="btn" onClick={tryUnlock} disabled={pin.length < 4}>Unlock chats</button>
      </div>
    );
  }

  if (callUrl) {
    return (
      <div className="shell" style={{ padding: 0, height: "100dvh", display: "flex", flexDirection: "column" }}>
        <div className="topbar">
          <span style={{ fontSize: 13, flex: 1, fontWeight: 700 }}>In call</span>
          <button className="btn btn-sm" style={{ background: "#f43f5e" }} onClick={() => setCallUrl(null)}>End</button>
        </div>
        <iframe src={callUrl} style={{ flex: 1, width: "100%", border: 0 }} allow="camera; microphone; fullscreen; autoplay" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  const lockOn = hasChatLock();
  const locked = threads.filter((t) => t.locked);
  const open = threads.filter((t) => !t.locked);
  const list = (lockOn ? open : threads).filter(t => {
    if (!q.trim()) return true;
    const n = displayName(t.profile).toLowerCase();
    return n.includes(q.trim().toLowerCase());
  });

  return (
    <div className="shell">
      {incoming && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 90,
          background: "linear-gradient(135deg,#7c3aed,#ec4899)",
          padding: "16px 18px", color: "#fff",
          boxShadow: "0 8px 32px rgba(124,58,237,0.45)",
        }}>
          <p style={{ fontWeight: 800, fontSize: 16 }}>Incoming {incoming.call_type} call</p>
          <p style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Accept to join instantly</p>
          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <button className="btn btn-sm" style={{ background: "#34d399", color: "#000", flex: 1 }} onClick={acceptCall}>Accept</button>
            <button className="btn btn-sm" style={{ background: "#f43f5e", flex: 1 }} onClick={declineCall}>Decline</button>
          </div>
        </div>
      )}

      <div className="topbar">
        <div className="logo">HATCH</div>
        <Link href="/discover" className="btn-ghost btn-sm">+ New</Link>
      </div>

      <div className="page" style={{ paddingTop: incoming ? 100 : undefined }}>
        <h1 className="h1" style={{ marginBottom: 12, fontSize: 22 }}>Chats</h1>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          style={{
            marginBottom: 14, borderRadius: 16,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />

        {lockOn && locked.length > 0 && (
          <div
            className="card"
            style={{ marginBottom: 12, cursor: "pointer" }}
            onClick={() => setFolderOpen(!folderOpen)}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700 }}>🔒 Locked · {locked.length}</div>
              <span className="badge">{folderOpen ? "Hide" : "Open"}</span>
            </div>
          </div>
        )}

        {folderOpen && locked.map((t) => (
          <Link key={t.peerId} href={"/chat/" + t.peerId} className="card row" style={{ display: "flex", marginBottom: 8, gap: 12, alignItems: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
              background: t.profile?.avatar_url ? "url(" + t.profile.avatar_url + ") center/cover" : "var(--grad-cool)",
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{displayName(t.profile)}</div>
              <p className="muted" style={{ fontSize: 12 }}>{t.last?.content?.slice(0, 50) || "Locked"}</p>
            </div>
          </Link>
        ))}

        {list.map((t) => {
          const isOn = isRecentlyOnline(t.profile?.last_seen);
          return (
            <Link
              key={t.peerId}
              href={"/chat/" + t.peerId}
              className="card row"
              style={{
                display: "flex", marginBottom: 10, gap: 12, alignItems: "center",
                background: t.unread
                  ? "linear-gradient(90deg,rgba(124,58,237,0.18),rgba(236,72,153,0.08))"
                  : "rgba(255,255,255,0.04)",
                border: t.unread ? "1px solid rgba(167,139,250,0.35)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: t.profile?.avatar_url
                    ? "url(" + t.profile.avatar_url + ") center/cover"
                    : "var(--grad-cool)",
                  boxShadow: isOn ? "0 0 0 2px #34d399" : undefined,
                }} />
                {isOn && (
                  <span style={{
                    position: "absolute", bottom: 2, right: 2,
                    width: 12, height: 12, borderRadius: "50%",
                    background: "#34d399", border: "2px solid #0f0f14",
                  }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: t.unread ? 800 : 600 }}>
                    {t.pinned ? "📌 " : ""}{displayName(t.profile)}
                  </div>
                  <span className="muted" style={{ fontSize: 11 }}>{timeAgo(t.last?.created_at)}</span>
                </div>
                <div className="row" style={{ justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                  <p className="muted" style={{
                    fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontWeight: t.unread ? 600 : 400,
                  }}>
                    {t.last?.content || "Say hi 👋"}
                  </p>
                  {t.unread > 0 && (
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: 10, padding: "0 6px",
                      background: "linear-gradient(135deg,#8b5cf6,#ec4899)",
                      color: "#fff", fontSize: 11, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{t.unread > 9 ? "9+" : t.unread}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {threads.length === 0 && (
          <div className="empty" style={{ padding: "40px 16px" }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>No chats yet</p>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Find someone free on campus or on Discover</p>
            <div className="row" style={{ gap: 8, justifyContent: "center" }}>
              <Link href="/home" className="btn btn-sm">I&apos;m Free</Link>
              <Link href="/discover" className="btn-ghost btn-sm">Find people</Link>
            </div>
          </div>
        )}
      </div>
      <Nav />
    </div>
  );
}
