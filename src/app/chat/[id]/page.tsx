"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, rateLimit, isRecentlyOnline } from "@/lib/supabase";
import { haptic, playPing, bumpChatStreak, markMessagesRead, bumpDaily } from "@/lib/obsession";
import { soundSend } from "@/lib/uiSounds";
import { isBlockedEitherWay } from "@/lib/blocks";
import { getChatTheme, setChatThemeId, CHAT_THEMES, type ChatThemeId } from "@/lib/chatTheme";
import { togglePin, isPinned } from "@/lib/pins";
import { toggleMute, isMuted, toggleArchive, isArchived } from "@/lib/chatPrefs";
import Avatar from "@/components/Avatar";
import ChatBlockBar from "@/components/ChatBlockBar";

type Msg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string;
  _local?: boolean;
  _failed?: boolean;
};

const QUICK_EMOJI = ["👍", "🔥", "😂", "❤️", "👏", "🙏", "✨", "💯"];

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ChatPage() {
  const { id: peerId } = useParams<{ id: string }>();
  const [myId, setMyId] = useState<string | null>(null);
  const [peer, setPeer] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [sending, setSending] = useState(false);
  const [themeId, setThemeId] = useState<ChatThemeId>("midnight");
  const [showThemes, setShowThemes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [muted, setMuted] = useState(false);
  const [archived, setArchived] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const theme = CHAT_THEMES.find((t) => t.id === themeId) || getChatTheme();

  const scrollEnd = useCallback(() => {
    requestAnimationFrame(() => bottom.current?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  const loadMsgs = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, media_url, media_type, created_at")
        .or(
          `and(sender_id.eq.${uid},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${uid})`
        )
        .order("created_at", { ascending: false })
        .limit(80);
      setMsgs(((data as Msg[]) || []).slice().reverse());
      scrollEnd();
    },
    [peerId, scrollEnd]
  );

  useEffect(() => {
    try {
      setThemeId(getChatTheme().id);
      setPinned(isPinned(peerId));
      setMuted(isMuted(peerId));
      setArchived(isArchived(peerId));
    } catch {
      /* */
    }
  }, [peerId]);

  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setMyId(user.id);

      if (await isBlockedEitherWay(user.id, peerId)) {
        setBlocked(true);
        setLoading(false);
        return;
      }

      try {
        const q = new URLSearchParams(window.location.search);
        const ctx = q.get("ctx");
        if (ctx) setText(decodeURIComponent(ctx).slice(0, 160));
      } catch {
        /* */
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, avatar_url, last_seen, department")
        .eq("id", peerId)
        .maybeSingle();
      setPeer(p);

      await loadMsgs(user.id);
      markMessagesRead(user.id, peerId).catch(() => {});
      setLoading(false);

      ch = supabase
        .channel("dm-" + [user.id, peerId].sort().join("-"))
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            const m = payload.new as Msg;
            if (m.sender_id !== peerId) return;
            setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            haptic(8);
            if (!isMuted(peerId)) playPing();
            scrollEnd();
            markMessagesRead(user.id, peerId).catch(() => {});
          }
        )
        .subscribe();
    })();

    return () => {
      if (ch) supabase.removeChannel(ch);
    };
  }, [peerId, router, loadMsgs, scrollEnd]);

  async function send() {
    if (!myId || sending) return;
    const content = text.trim();
    if (!content) return;
    if (!rateLimit("msg:" + myId, 40, 60000)) return;

    setText("");
    setSending(true);
    const tempId = "local-" + Date.now();
    setMsgs((prev) => [
      ...prev,
      {
        id: tempId,
        sender_id: myId,
        receiver_id: peerId,
        content,
        created_at: new Date().toISOString(),
        _local: true,
      },
    ]);
    scrollEnd();
    try {
      soundSend();
    } catch {
      /* */
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: myId, receiver_id: peerId, content })
      .select("id, sender_id, receiver_id, content, created_at")
      .single();

    if (error || !data) {
      setMsgs((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _failed: true, _local: false } : m))
      );
      setText(content);
      setSending(false);
      return;
    }

    setMsgs((prev) => prev.map((m) => (m.id === tempId ? { ...(data as Msg) } : m)));
    bumpDaily(myId, "messages").catch(() => {});
    bumpChatStreak(myId, peerId).catch(() => {});
    setSending(false);
  }

  function onScrollList() {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowJump(!nearBottom);
  }

  const peerName = displayName(peer || {});
  const online = isRecentlyOnline(peer?.last_seen);

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading chat…</span>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="shell" style={{ padding: 24 }}>
        <Link href="/inbox" className="btn-ghost btn-sm">
          ← Inbox
        </Link>
        <p className="muted" style={{ marginTop: 24, textAlign: "center" }}>
          This chat isn't available.
        </p>
      </div>
    );
  }

  let lastDay = "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxWidth: "var(--max, 480px)",
        margin: "0 auto",
        background: theme.bg,
        color: theme.theirsText,
        position: "relative",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "color-mix(in srgb, " + theme.bg + " 94%, transparent)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <Link href="/inbox" className="btn-ghost btn-sm" aria-label="Back">
          ←
        </Link>
        <Link
          href={"/u/" + peerId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <Avatar profile={peer} size={42} online={online} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {peerName}
            </div>
            <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>
              {peer?.username
                ? "@" + peer.username
                : online
                  ? "Active recently"
                  : peer?.department || "Hatch student"}
            </p>
          </div>
        </Link>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => {
            setShowThemes((v) => !v);
            setMenuOpen(false);
          }}
          aria-expanded={showThemes}
        >
          Theme
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => {
            setMenuOpen((v) => !v);
            setShowThemes(false);
          }}
          aria-expanded={menuOpen}
          aria-label="More"
        >
          ···
        </button>
      </header>

      {menuOpen && (
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setPinned(togglePin(peerId));
            }}
          >
            {pinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setMuted(toggleMute(peerId));
            }}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setArchived(toggleArchive(peerId));
            }}
          >
            {archived ? "Unarchive" : "Archive"}
          </button>
          <Link href={"/u/" + peerId} className="btn-ghost btn-sm">
            Profile
          </Link>
          <Link href="/inbox" className="btn-ghost btn-sm">
            Inbox
          </Link>
        </div>
      )}

      {showThemes && (
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {CHAT_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setChatThemeId(t.id);
                setThemeId(t.id);
              }}
              style={{
                fontSize: 11,
                padding: "6px 10px",
                borderRadius: 999,
                border: themeId === t.id ? "2px solid " + t.mine : "1px solid rgba(255,255,255,0.15)",
                background: t.bg,
                color: t.theirsText,
                cursor: "pointer",
              }}
            >
              {t.name}
            </button>
          ))}
          <p style={{ fontSize: 11, opacity: 0.65, width: "100%", margin: 0 }}>
            Themes stay on your device only.
          </p>
        </div>
      )}

      {myId && (
        <ChatBlockBar
          myId={myId}
          peerId={peerId}
          peerName={peerName}
          onBlocked={() => setBlocked(true)}
        />
      )}

      <div
        ref={listRef}
        onScroll={onScrollList}
        style={{ flex: 1, overflowY: "auto", padding: "12px 14px 8px", position: "relative" }}
      >
        {!msgs.length && (
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Avatar profile={peer} size={72} />
            <p style={{ fontWeight: 800, marginTop: 12, fontSize: 16 }}>{peerName}</p>
            <p style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>Say hi — keep it respectful.</p>
          </div>
        )}

        {msgs.map((m) => {
          const mine = m.sender_id === myId;
          const day = dayLabel(m.created_at);
          const showDay = day !== lastDay;
          if (showDay) lastDay = day;
          return (
            <div key={m.id}>
              {showDay && (
                <p style={{ textAlign: "center", fontSize: 11, opacity: 0.55, margin: "14px 0 10px" }}>
                  {day}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 6,
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onDoubleClick={() => {
                    if (m.content) {
                      try {
                        void navigator.clipboard.writeText(m.content);
                      } catch {
                        /* */
                      }
                    }
                  }}
                  title="Double-tap to copy"
                  style={{
                    maxWidth: "78%",
                    padding: "10px 12px",
                    borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: mine ? theme.mine : theme.theirs,
                    color: mine ? theme.mineText : theme.theirsText,
                    opacity: m._local ? 0.75 : 1,
                    border: m._failed ? "1px solid #f87171" : "none",
                    fontSize: 14,
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                  }}
                >
                  {m.content}
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: "right" }}>
                    {m._failed
                      ? "Failed — edit & resend"
                      : new Date(m.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {showJump && (
        <button
          type="button"
          onClick={scrollEnd}
          style={{
            position: "absolute",
            bottom: 88,
            right: 16,
            zIndex: 15,
            borderRadius: 999,
            padding: "8px 12px",
            border: "none",
            background: theme.mine,
            color: theme.mineText,
            fontWeight: 700,
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          }}
        >
          ↓ Latest
        </button>
      )}

      {showEmoji && (
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "8px 12px",
            overflowX: "auto",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {QUICK_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setText((t) => (t + e).slice(0, 2000))}
              style={{
                fontSize: 20,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          background: theme.bg,
        }}
      >
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => setShowEmoji((v) => !v)}
          aria-label="Emoji"
        >
          ☺
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Message…"
          rows={1}
          aria-label="Message"
          style={{
            flex: 1,
            resize: "none",
            maxHeight: 120,
            borderRadius: 16,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            color: theme.theirsText,
            font: "inherit",
          }}
        />
        <button
          type="button"
          className="btn btn-sm"
          disabled={!text.trim() || sending}
          onClick={() => void send()}
          style={{ background: theme.mine, color: theme.mineText, border: "none" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
