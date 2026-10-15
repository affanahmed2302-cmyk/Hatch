"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, rateLimit } from "@/lib/supabase";
import { haptic, playPing, bumpChatStreak, markMessagesRead, bumpDaily } from "@/lib/obsession";
import { soundSend } from "@/lib/uiSounds";
import { isBlockedEitherWay, blockUser } from "@/lib/blocks";

type Msg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string;
  _local?: boolean;
};

/** Fast DM — no Jitsi, no laggy call iframe. Message-first like IG. */
export default function ChatPage() {
  const { id: peerId } = useParams<{ id: string }>();
  const [myId, setMyId] = useState<string | null>(null);
  const [peer, setPeer] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
      const list = ((data as Msg[]) || []).slice().reverse();
      setMsgs(list);
      scrollEnd();
    },
    [peerId, scrollEnd]
  );

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

      // Single lightweight realtime channel
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
            setMsgs((prev) => {
              if (prev.some((x) => x.id === m.id)) return prev;
              return [...prev, m];
            });
            haptic(8);
            playPing();
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
    const optimistic: Msg = {
      id: tempId,
      sender_id: myId,
      receiver_id: peerId,
      content,
      created_at: new Date().toISOString(),
      _local: true,
    };
    setMsgs((prev) => [...prev, optimistic]);
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
      setMsgs((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
      setSending(false);
      return;
    }

    setMsgs((prev) => prev.map((m) => (m.id === tempId ? { ...(data as Msg) } : m)));
    bumpDaily(myId, "messages").catch(() => {});
    bumpChatStreak(myId, peerId).catch(() => {});
    setSending(false);
  }

  const peerName = displayName(peer || {});

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
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
          This chat isn&apos;t available.
        </p>
      </div>
    );
  }

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <div className="topbar" style={{ gap: 10 }}>
        <Link href="/inbox" className="btn-ghost btn-sm" style={{ padding: "8px 10px" }}>
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
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              flexShrink: 0,
              background: peer?.avatar_url
                ? `url(${peer.avatar_url}) center/cover`
                : "linear-gradient(135deg,#8b5cf6,#ec4899)",
            }}
          />
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
            <div className="muted" style={{ fontSize: 11 }}>
              {peer?.department || "Campus"}
            </div>
          </div>
        </Link>
        {myId && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            style={{ fontSize: 11, color: "#fb7185" }}
            onClick={async () => {
              if (!confirm(`Block ${peerName}?`)) return;
              await blockUser(myId, peerId);
              setBlocked(true);
            }}
          >
            Block
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", WebkitOverflowScrolling: "touch" }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{peerName}</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Say hi — keep it real
            </p>
          </div>
        )}
        {msgs.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div
              key={m.id}
              className={mine ? "bubble-me" : "bubble-them"}
              style={{ marginBottom: 6, opacity: m._local ? 0.7 : 1 }}
            >
              <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div
        style={{
          padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "rgba(7,7,12,0.95)",
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          style={{
            flex: 1,
            borderRadius: 22,
            padding: "12px 16px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          className="btn btn-sm"
          style={{ borderRadius: "50%", width: 44, height: 44, padding: 0 }}
          onClick={() => void send()}
          disabled={!text.trim() || sending}
          aria-label="Send"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
