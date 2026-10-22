"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, isRecentlyOnline, touchPresence } from "@/lib/supabase";
import { hasChatLock, isChatUnlocked, unlockChat, isChatLocked } from "@/lib/chatLock";
import { getPinned, togglePin } from "@/lib/pins";
import { getIsolationSet } from "@/lib/blocks";
import {
  getArchived,
  getMuted,
  isArchived,
  isForceUnread,
  isMuted,
  toggleArchive,
  toggleMute,
  clearForceUnread,
  markForceUnread,
} from "@/lib/chatPrefs";
import Avatar from "@/components/Avatar";
import Nav from "@/components/Nav";

type Thread = {
  peerId: string;
  profile: any;
  last: any;
  locked: boolean;
  unread: number;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
};

type Filter = "all" | "unread" | "archived";

export default function InboxPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needPin, setNeedPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [folderOpen, setFolderOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setMyId(user.id);
      touchPresence(user.id);
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setMe(p);
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
      setError("");
      const isolated = await getIsolationSet(uid);
      const { data: msgs, error: qErr } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at, read_at")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(150);

      if (qErr) {
        setError("Could not load chats. Retry.");
        setThreads([]);
        return;
      }

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
      const mutedSet = new Set(getMuted());
      const archSet = new Set(getArchived());
      const list: Thread[] = peerIds.map((id) => {
        let unread = unreadMap.get(id) || 0;
        if (isForceUnread(id) && unread === 0) unread = 1;
        return {
          peerId: id,
          profile: byId[id] || {},
          last: map.get(id),
          locked: isChatLocked(id),
          unread,
          pinned: pinnedSet.has(id),
          muted: mutedSet.has(id),
          archived: archSet.has(id),
        };
      });
      list.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const ta = a.last?.created_at ? new Date(a.last.created_at).getTime() : 0;
        const tb = b.last?.created_at ? new Date(b.last.created_at).getTime() : 0;
        return tb - ta;
      });
      setThreads(list);
    } catch {
      setError("Could not load chats.");
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

  function refreshPrefs() {
    if (myId) void loadThreads(myId);
    setMenuFor(null);
  }

  const visible = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return threads.filter((t) => {
      if (filter === "archived") {
        if (!t.archived) return false;
      } else {
        if (t.archived) return false;
        if (filter === "unread" && t.unread <= 0) return false;
      }
      if (!qq) return true;
      const name = displayName(t.profile).toLowerCase();
      const un = (t.profile?.username || "").toLowerCase();
      const last = (t.last?.content || "").toLowerCase();
      return name.includes(qq) || un.includes(qq) || last.includes(qq);
    });
  }, [threads, filter, q]);

  const locked = threads.filter((t) => t.locked && !t.archived);
  const main = visible.filter((t) => !t.locked);

  if (needPin) {
    return (
      <div className="shell" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
        <h1 className="h1" style={{ marginBottom: 8, textAlign: "center" }}>
          Locked inbox
        </h1>
        {pinErr && <div className="fail">{pinErr}</div>}
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className="input"
          style={{ marginTop: 12 }}
        />
        <button type="button" className="btn" style={{ marginTop: 12 }} onClick={tryUnlock}>
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="shell" style={{ paddingBottom: 88 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px 8px",
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "color-mix(in srgb, var(--bg) 92%, transparent)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="muted" style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
            Hatch
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Chats</h1>
        </div>
        <Link href="/discover" className="btn btn-sm" aria-label="New chat">
          New
        </Link>
        <Link href="/u/me" aria-label="My profile">
          <Avatar profile={me} size={36} />
        </Link>
      </header>

      <div style={{ padding: "0 16px 8px" }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, @username, or message"
          aria-label="Search conversations"
          style={{ width: "100%", borderRadius: 14 }}
        />
        <div role="tablist" style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
          {(
            [
              ["all", "All"],
              ["unread", "Unread"],
              ["archived", "Archived"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={filter === id ? "btn btn-sm" : "btn-ghost btn-sm"}
              onClick={() => setFilter(id)}
              style={{ flexShrink: 0 }}
            >
              {label}
              {id === "unread" && threads.filter((t) => t.unread > 0 && !t.archived).length > 0
                ? ` · ${threads.filter((t) => t.unread > 0 && !t.archived).length}`
                : ""}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Groups and requests appear when those features are live. Find people via Discover or Match.
        </p>
      </div>

      {loading && (
        <div style={{ padding: 24, textAlign: "center" }}>
          <p className="muted">Loading conversations…</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: 16 }}>
          <p className="fail">{error}</p>
          <button type="button" className="btn btn-sm" onClick={() => myId && loadThreads(myId)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && locked.length > 0 && filter === "all" && (
        <div style={{ padding: "0 16px 8px" }}>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setFolderOpen((v) => !v)}>
            {folderOpen ? "Hide" : "Show"} locked ({locked.length})
          </button>
          {folderOpen &&
            locked.map((t) => (
              <div key={t.peerId} className="card row" style={{ marginTop: 8, opacity: 0.85 }}>
                <Avatar profile={t.profile} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{displayName(t.profile)}</div>
                  <p className="muted" style={{ fontSize: 12 }}>
                    Locked chat
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}

      <div style={{ padding: "4px 12px 16px" }}>
        {!loading && main.length === 0 && (
          <div className="empty" style={{ padding: "40px 16px", textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 16 }}>
              {filter === "unread"
                ? "No unread chats"
                : filter === "archived"
                  ? "Nothing archived"
                  : "No chats yet"}
            </p>
            <p className="muted" style={{ fontSize: 13, margin: "8px 0 16px" }}>
              {filter === "all"
                ? "Start from Discover or Skill match — real names, real profiles."
                : "Switch filter or search."}
            </p>
            {filter === "all" && (
              <>
                <Link href="/discover" className="btn btn-sm">
                  Discover
                </Link>{" "}
                <Link href="/match" className="btn-ghost btn-sm">
                  Skill match
                </Link>
              </>
            )}
          </div>
        )}

        {main.map((t) => {
          const isOn = isRecentlyOnline(t.profile?.last_seen);
          const open = menuFor === t.peerId;
          return (
            <div
              key={t.peerId}
              style={{
                position: "relative",
                marginBottom: 8,
                borderRadius: 16,
                border: t.unread ? "1px solid rgba(199,243,107,0.35)" : "1px solid var(--border)",
                background: t.unread ? "var(--lime-soft)" : "var(--elevated)",
              }}
            >
              <div style={{ display: "flex", alignItems: "stretch" }}>
                <Link
                  href={"/chat/" + t.peerId}
                  onClick={() => clearForceUnread(t.peerId)}
                  style={{
                    display: "flex",
                    flex: 1,
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 8px 12px 12px",
                    textDecoration: "none",
                    color: "inherit",
                    minWidth: 0,
                  }}
                >
                  <Avatar profile={t.profile} size={52} online={isOn} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: t.unread ? 800 : 600,
                            fontSize: 15,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.pinned ? "📌 " : ""}
                          {t.muted ? "🔇 " : ""}
                          {displayName(t.profile)}
                        </div>
                        {t.profile?.username && (
                          <p className="muted" style={{ fontSize: 11, margin: 0 }}>
                            @{t.profile.username}
                          </p>
                        )}
                      </div>
                      <span className="muted" style={{ fontSize: 11, flexShrink: 0 }}>
                        {timeAgo(t.last?.created_at)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, gap: 8 }}>
                      <p
                        className="muted"
                        style={{
                          fontSize: 13,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: t.unread ? 600 : 400,
                          margin: 0,
                        }}
                      >
                        {t.last?.content || "Say hi"}
                      </p>
                      {t.unread > 0 && (
                        <span
                          style={{
                            minWidth: 20,
                            height: 20,
                            borderRadius: 10,
                            padding: "0 6px",
                            background: "var(--lime)",
                            color: "#10110f",
                            fontSize: 11,
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {t.unread > 9 ? "9+" : t.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  aria-label="Conversation options"
                  aria-expanded={open}
                  onClick={() => setMenuFor(open ? null : t.peerId)}
                  style={{ padding: "0 10px", alignSelf: "center" }}
                >
                  ···
                </button>
              </div>
              {open && (
                <div
                  style={{
                    padding: "0 12px 12px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      togglePin(t.peerId);
                      refreshPrefs();
                    }}
                  >
                    {t.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      toggleMute(t.peerId);
                      refreshPrefs();
                    }}
                  >
                    {t.muted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      toggleArchive(t.peerId);
                      refreshPrefs();
                    }}
                  >
                    {t.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      markForceUnread(t.peerId);
                      refreshPrefs();
                    }}
                  >
                    Mark unread
                  </button>
                  <Link href={"/u/" + t.peerId} className="btn-ghost btn-sm">
                    Profile
                  </Link>
                  <Link href={"/chat/" + t.peerId} className="btn-ghost btn-sm">
                    Open
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Nav />
    </div>
  );
}
