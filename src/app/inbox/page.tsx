"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, handleOf, isRecentlyOnline, touchPresence } from "@/lib/supabase";
import { hasChatLock, isChatUnlocked, unlockChat, isChatLocked } from "@/lib/chatLock";
import { fetchActiveIncoming, respondCall, callEmbedUrl, type CallRow } from "@/lib/calls";
import Nav from "@/components/Nav";

type Thread = { peerId: string; profile: any; last: any; locked: boolean };

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
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      touchPresence(user.id);
      const { data: me } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
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
        .select("id, sender_id, receiver_id, content, created_at")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order("created_at", { ascending: false }).limit(100);
      const map = new Map<string, any>();
      for (const m of msgs || []) {
        const peer = m.sender_id === uid ? m.receiver_id : m.sender_id;
        if (!map.has(peer)) map.set(peer, m);
      }
      const peerIds = [...map.keys()];
      if (!peerIds.length) { setThreads([]); return; }
      const { data: profs } = await supabase.from("profiles")
        .select("id, full_name, username, avatar_url, last_seen").in("id", peerIds);
      const byId = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
      setThreads(peerIds.map((id) => ({
        peerId: id, profile: byId[id] || {}, last: map.get(id), locked: isChatLocked(id),
      })));
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

  if (needPin) {
    return (
      <div className="shell" style={{ padding: 24 }}>
        <h1 className="h1" style={{ marginBottom: 8 }}>Unlock chats</h1>
        <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>Enter PIN once for this session</p>
        {pinErr && <div className="fail" style={{ marginBottom: 8 }}>{pinErr}</div>}
        <input type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ marginBottom: 12 }} />
        <button className="btn" onClick={tryUnlock} disabled={pin.length < 4}>Unlock</button>
      </div>
    );
  }

  if (callUrl) {
    return (
      <div className="shell" style={{ padding: 0 }}>
        <div className="topbar">
          <span style={{ fontSize: 13, flex: 1 }}>In call</span>
          <button className="btn btn-sm" style={{ background: "#f43f5e" }} onClick={() => setCallUrl(null)}>End</button>
        </div>
        <iframe src={callUrl} style={{ width: "100%", height: "calc(100dvh - 56px)", border: 0 }} allow="camera; microphone; fullscreen; autoplay" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading...</span>
      </div>
    );
  }

  const lockOn = hasChatLock();
  const locked = threads.filter((t) => t.locked);
  const open = threads.filter((t) => !t.locked);

  return (
    <div className="shell">
      {incoming && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 90,
          background: "linear-gradient(135deg,#8b5cf6,#ec4899)", padding: "14px 18px", color: "#fff",
        }}>
          <p style={{ fontWeight: 700 }}>Incoming {incoming.call_type} call</p>
          <div className="row" style={{ gap: 10, marginTop: 10 }}>
            <button className="btn btn-sm" style={{ background: "#34d399", color: "#000" }} onClick={acceptCall}>Accept</button>
            <button className="btn btn-sm" style={{ background: "#f43f5e" }} onClick={declineCall}>Decline</button>
            <Link href={"/chat/" + incoming.caller_id} className="btn-ghost btn-sm" style={{ color: "#fff" }}>Open chat</Link>
          </div>
        </div>
      )}

      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page" style={{ paddingTop: incoming ? 90 : undefined }}>
        <h1 className="h1" style={{ marginBottom: 12 }}>Inbox</h1>

        {lockOn && locked.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }} onClick={() => setFolderOpen(!folderOpen)}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>Locked chats ({locked.length})</span>
              <span className="muted">{folderOpen ? "Hide" : "Open"}</span>
            </div>
          </div>
        )}

        {folderOpen && locked.map((t) => (
          <Link key={t.peerId} href={"/chat/" + t.peerId} className="card" style={{ display: "block", marginBottom: 8 }}>
            <div className="h2" style={{ fontSize: 15 }}>{displayName(t.profile)}</div>
            <p className="muted" style={{ fontSize: 12 }}>{t.last?.content?.slice(0, 60)}</p>
          </Link>
        ))}

        {(lockOn ? open : threads).map((t) => (
          <Link key={t.peerId} href={"/chat/" + t.peerId} className="card row" style={{ display: "flex", marginBottom: 8, gap: 12, alignItems: "center" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: t.profile?.avatar_url ? "url(" + t.profile.avatar_url + ") center/cover" : "var(--grad-cool)",
              boxShadow: isRecentlyOnline(t.profile?.last_seen) ? "0 0 0 2px #34d399" : undefined,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="h2" style={{ fontSize: 15 }}>{displayName(t.profile)}</div>
                {isRecentlyOnline(t.profile?.last_seen) && <span className="badge" style={{ color: "#34d399" }}>online</span>}
              </div>
              <p className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.last?.content || "Tap to chat"}
              </p>
            </div>
          </Link>
        ))}

        {threads.length === 0 && (
          <div className="empty">
            <p>No chats yet</p>
            <Link href="/discover" className="btn btn-sm" style={{ marginTop: 12, display: "inline-block" }}>Find people</Link>
          </div>
        )}
      </div>
      <Nav />
    </div>
  );
}
