"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, handleOf } from "@/lib/supabase";
import {
  hasChatLock, isChatUnlocked, unlockChat, isChatLocked,
} from "@/lib/chatLock";
import Nav from "@/components/Nav";

type Thread = {
  peerId: string;
  profile: any;
  last: any;
  locked: boolean;
};

export default function InboxPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [needPin, setNeedPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [folderOpen, setFolderOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      if (hasChatLock() && !isChatUnlocked()) {
        setNeedPin(true);
        setLoading(false);
        return;
      }
      await loadThreads(user.id);
      setLoading(false);
    })();
  }, [router]);

  async function loadThreads(uid: string) {
    try {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(100);
      const peers = new Map<string, any>();
      (msgs || []).forEach((m: any) => {
        const peer = m.sender_id === uid ? m.receiver_id : m.sender_id;
        if (!peers.has(peer)) peers.set(peer, m);
      });
      const ids = [...peers.keys()];
      if (!ids.length) { setThreads([]); return; }
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, username").in("id", ids);
      const map: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { map[p.id] = p; });
      setThreads(
        ids.map((id) => ({
          peerId: id,
          profile: map[id] || {},
          last: peers.get(id),
          locked: isChatLocked(id),
        })),
      );
    } catch {
      setThreads([]);
    }
  }

  function tryUnlock() {
    if (unlockChat(pin)) {
      setNeedPin(false);
      setPinErr("");
      setFolderOpen(true);
      if (myId) loadThreads(myId);
    } else setPinErr("Wrong PIN");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  if (needPin) {
    return (
      <div className="shell" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="logo" style={{ marginBottom: 16 }}>HATCH</div>
        <h1 className="h1" style={{ marginBottom: 8 }}>Unlock chats</h1>
        <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>Enter PIN once for this session</p>
        {pinErr && <div className="fail" style={{ marginBottom: 10 }}>{pinErr}</div>}
        <input type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ marginBottom: 12 }} />
        <button className="btn" onClick={tryUnlock} disabled={pin.length < 4}>Unlock</button>
      </div>
    );
  }

  const lockOn = hasChatLock();
  const locked = threads.filter((t) => t.locked);
  const open = lockOn ? threads.filter((t) => !t.locked) : threads;

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 12 }}>Inbox</h1>

        {lockOn && (
          <div className="card" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="row"
              style={{ width: "100%", justifyContent: "space-between", background: "none", border: 0, color: "inherit", cursor: "pointer", padding: 0 }}
              onClick={() => setFolderOpen(!folderOpen)}
            >
              <span className="h2">🔒 Locked chats ({locked.length})</span>
              <span className="muted">{folderOpen ? "Hide" : "Open"}</span>
            </button>
            {folderOpen && (
              <div style={{ marginTop: 10 }}>
                {locked.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No locked chats</p>}
                {locked.map((t) => (
                  <Link key={t.peerId} href={`/chat/${t.peerId}`} className="card" style={{ display: "block", marginBottom: 8 }}>
                    <div className="h2">{displayName(t.profile)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{handleOf(t.profile)}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {open.length === 0 && locked.length === 0 && (
          <div className="empty"><p>No chats yet · match or ping someone</p></div>
        )}
        {open.map((t) => (
          <Link key={t.peerId} href={`/chat/${t.peerId}`} className="card" style={{ display: "block", marginBottom: 8 }}>
            <div className="h2">{displayName(t.profile)}</div>
            <div className="muted" style={{ fontSize: 12 }}>{handleOf(t.profile)}</div>
            {t.last?.content && (
              <p style={{ fontSize: 13, marginTop: 6 }} className="muted">{String(t.last.content).slice(0, 80)}</p>
            )}
          </Link>
        ))}
      </div>
      <Nav />
    </div>
  );
}
