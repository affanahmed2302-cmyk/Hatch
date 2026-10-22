"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, isRecentlyOnline, touchPresence } from "@/lib/supabase";
import { hasChatLock, isChatUnlocked, unlockChat, isChatLocked } from "@/lib/chatLock";
import { getPinned } from "@/lib/pins";
import { getIsolationSet } from "@/lib/blocks";
import Avatar from "@/components/Avatar";
import Nav from "@/components/Nav";

type Thread = { peerId: string; profile: any; last: any; locked: boolean; unread: number; pinned: boolean };

export default function InboxPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [needPin, setNeedPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [folderOpen, setFolderOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      touchPresence(user.id);
      if (hasChatLock() && !isChatUnlocked()) {
        setNeedPin(true);
        setLoading(false);
        return;
      }
      await loadThreads(user.id);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel("inbox-msg-" + myId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void loadThreads(myId);
      })
      .subscribe();
    const t = setInterval(() => touchPresence(myId), 90000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
    };
  }, [myId]);

  async function loadThreads(uid: string) {
    try {
      const isolated = await getIsolationSet(uid);
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at, read_at")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(100);

      const map = new Map<string, any>();
      const unreadMap = new Map<string, number>();
      for (const m of msgs || []) {
        const peer = m.sender_id === uid ? m.receiver_id : m.sender_id;
        if (isolated.has(peer)) continue;
        if (!map.has(peer)) map.set(peer, m);
        if (m.receiver_id === uid && !m.read_at) {
          unreadMap.set(peer, (unreadMap.get(peer) || 0) + 1);
        }
      }
      const peerIds = [...map.keys()];
      if (!peerIds.length) {
        setThreads([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, avatar_url, last_seen, department")
        .in("id", peerIds);
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
      list.sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : 0));
      setThreads(list);
    } catch {
      setThreads([]);
    }
  }

  function tryUnlock() {
    if (unlockChat(pin)) {
      setNeedPin(false);
      setLoading(true);
      if (myId) loadThreads(myId).then(() => setLoading(false));
    } else setPinErr("Wrong PIN");
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
        <h1 className="h1" style={{ marginBottom: 8, textAlign: "center" }}>Locked inbox</h1>
        {pinErr && <div className="fail">{pinErr}</div>}
        <input type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ marginBottom: 12, textAlign: "center", fontSize: 22, letterSpacing: 8 }} />
        <button className="btn" onClick={tryUnlock} disabled={pin.length < 4}>Unlock</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  const lockOn = hasChatLock();
  const locked = threads.filter((t) => t.locked);
  const open = threads.filter((t) => !t.locked);
  const list = (lockOn ? open : threads).filter((t) => {
    if (!q.trim()) return true;
    return displayName(t.profile).toLowerCase().includes(q.trim().toLowerCase());
  });

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">Chats</div>
        <Link href="/discover" className="btn-ghost btn-sm">+ New</Link>
      </div>

      <div className="page">
        <h1 className="h1" style={{ marginBottom: 8, fontSize: 22 }}>Chats</h1>
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          Names from profiles · <Link href="/match">Skill match</Link>
        </p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" style={{ marginBottom: 14, borderRadius: 16 }} aria-label="Search chats" />

        {lockOn && locked.length > 0 && (
          <div className="card" style={{ marginBottom: 12, cursor: "pointer" }} onClick={() => setFolderOpen(!folderOpen)}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700 }}>Locked · {locked.length}</div>
              <span className="badge">{folderOpen ? "Hide" : "Open"}</span>
            </div>
          </div>
        )}

        {folderOpen && locked.map((t) => (
          <Link key={t.peerId} href={"/chat/" + t.peerId} className="card row" style={{ display: "flex", marginBottom: 8, gap: 12, alignItems: "center" }}>
            <Avatar profile={t.profile} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{displayName(t.profile)}</div>
              <p className="muted" style={{ fontSize: 12 }}>{t.last?.content?.slice(0, 40) || "Locked"}</p>
            </div>
          </Link>
        ))}

        {list.map((t) => {
          const isOn = isRecentlyOnline(t.profile?.last_seen);
          return (
            <Link key={t.peerId} href={"/chat/" + t.peerId} className="card row" style={{
              display: "flex", marginBottom: 10, gap: 12, alignItems: "center",
              background: t.unread ? "var(--lime-soft)" : undefined,
              borderColor: t.unread ? "rgba(199,243,107,0.35)" : undefined,
            }}>
              <Avatar profile={t.profile} size={52} online={isOn} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: t.unread ? 800 : 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.pinned ? "📌 " : ""}{displayName(t.profile)}
                    </div>
                    {t.profile?.username && (
                      <p className="muted" style={{ fontSize: 11 }}>@{t.profile.username}</p>
                    )}
                  </div>
                  <span className="muted" style={{ fontSize: 11 }}>{timeAgo(t.last?.created_at)}</span>
                </div>
                <div className="row" style={{ justifyContent: "space-between", marginTop: 2 }}>
                  <p className="muted" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: t.unread ? 600 : 400 }}>
                    {t.last?.content || "Say hi"}
                  </p>
                  {t.unread > 0 && (
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: 10, padding: "0 6px",
                      background: "var(--lime)", color: "#10110f", fontSize: 11, fontWeight: 800,
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
            <p style={{ fontWeight: 700 }}>No chats yet</p>
            <p className="muted" style={{ fontSize: 13, margin: "8px 0 16px" }}>Find people on Discover or Match</p>
            <Link href="/discover" className="btn btn-sm">Discover</Link>
            {" "}
            <Link href="/match" className="btn-ghost btn-sm">Skill match</Link>
          </div>
        )}
      </div>
      <Nav />
    </div>
  );
}
