"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, rateLimit } from "@/lib/supabase";
import { haptic, playPing, bumpChatStreak, markMessagesRead, bumpDaily } from "@/lib/obsession";
import { ensureNotifyPermission } from "@/lib/notify";
import { startCall, callEmbedUrl, type CallRow } from "@/lib/calls";

const REACTIONS = ["👍", "❤️", "😂", "🔥", "👏", "😮"];
const GIFTS = [
  { id: "coffee", emoji: "☕", label: "Coffee" },
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "trophy", emoji: "🏆", label: "Trophy" },
  { id: "heart", emoji: "💜", label: "Heart" },
  { id: "pizza", emoji: "🍕", label: "Pizza" },
];
const QUICK = ["On my way 👋", "Library?", "Canteen in 5", "Busy rn", "Ping me later", "Thanks!"];

type Msg = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string;
  read_at?: string | null;
};

export default function ChatPage() {
  const { id: peerId } = useParams<{ id: string }>();
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState("Hatch");
  const [peer, setPeer] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [ctxBanner, setCtxBanner] = useState<string | null>(null);
  const [ctxFrom, setCtxFrom] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [callUrl, setCallUrl] = useState<string | null>(null);
  const [callErr, setCallErr] = useState("");
  const [streak, setStreak] = useState(0);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const router = useRouter();

  const loadMsgs = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${uid},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${uid})`
      )
      .order("created_at", { ascending: true })
      .limit(250);
    setMsgs((data as Msg[]) || []);
    setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 40);
  }, [peerId]);

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
      ensureNotifyPermission();
      try {
        const q = new URLSearchParams(window.location.search);
        const from = q.get("from");
        const ctx = q.get("ctx");
        if (from) setCtxFrom(from);
        if (ctx) {
          const decoded = decodeURIComponent(ctx).slice(0, 180);
          setCtxBanner(decoded);
          setText((prev) => prev || decoded);
        }
        if (q.get("call") === "1") {
          const u = sessionStorage.getItem("hatch_active_call_url");
          if (u) setCallUrl(u);
        }
      } catch {
        /* */
      }
      const { data: me } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .maybeSingle();
      setMyName(displayName(me || {}) || "Hatch");
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, last_seen")
        .eq("id", peerId)
        .maybeSingle();
      setPeer(p);
      await loadMsgs(user.id);
      await markMessagesRead(user.id, peerId);
      try {
        const s = await bumpChatStreak(user.id, peerId);
        if (typeof s === "number") setStreak(s);
      } catch {
        /* */
      }
      setLoading(false);
    })();
  }, [peerId, router, loadMsgs]);

  useEffect(() => {
    if (!myId || !peerId) return;
    const room = "dm-" + [myId, peerId].sort().join("-");
    const ch = supabase
      .channel(room)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async () => {
        await loadMsgs(myId);
        haptic(8);
        playPing();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, peerId, loadMsgs]);

  async function insertMsg(payload: Record<string, unknown>) {
    if (!myId) return;
    if (!rateLimit("msg:" + myId, 50, 60000)) return;
    await supabase.from("messages").insert({
      sender_id: myId,
      receiver_id: peerId,
      ...payload,
    });
    await bumpDaily(myId, "messages");
    await bumpChatStreak(myId, peerId);
    await loadMsgs(myId);
  }

  async function sendText(content?: string) {
    const body = (content ?? text).trim();
    if (!body) return;
    setText("");
    const final = replyTo
      ? `↩ ${String(replyTo.content || "media").slice(0, 40)}\n${body}`
      : body;
    setReplyTo(null);
    await insertMsg({ content: final });
  }

  async function sendGift(g: (typeof GIFTS)[0]) {
    setShowGifts(false);
    await insertMsg({ content: `🎁 Gift: ${g.emoji} ${g.label}` });
    haptic([10, 30, 10]);
  }

  async function sendReaction(emoji: string) {
    await insertMsg({ content: emoji });
  }

  async function startVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        if (blob.size < 200) return;
        const path = `voice/${myId}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from("chat-media").upload(path, blob, {
          contentType: "audio/webm",
          upsert: false,
        });
        if (error) {
          // Fallback: mark as voice note text if storage missing
          await insertMsg({ content: "🎤 Voice note (upload setup needed — create chat-media bucket)" });
          return;
        }
        const { data: pub } = supabase.storage.from("chat-media").getPublicUrl(path);
        await insertMsg({
          content: "🎤 Voice note",
          media_url: pub.publicUrl,
          media_type: "audio",
        });
      };
      mediaRec.current = rec;
      rec.start();
      setRecording(true);
      haptic(12);
    } catch {
      setCallErr("Mic permission needed for voice notes");
    }
  }

  function stopVoice() {
    try {
      mediaRec.current?.stop();
    } catch {
      /* */
    }
    setRecording(false);
  }

  async function doCall(type: "audio" | "video") {
    if (!myId) return;
    setCallErr("");
    const res = await startCall(myId, peerId, type);
    if (!res.ok || !res.call) {
      setCallErr(res.error || "Call failed");
      return;
    }
    const url = callEmbedUrl(res.call as CallRow, myName);
    setCallUrl(url);
    sessionStorage.setItem("hatch_active_call_url", url);
    sessionStorage.setItem("hatch_active_call_id", res.call.id);
  }

  function copyChatLink() {
    try {
      void navigator.clipboard.writeText(location.href);
      haptic(8);
    } catch {
      /* */
    }
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading chat…</span>
      </div>
    );
  }

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      {/* 1 Header + profile + streak */}
      <div className="topbar" style={{ gap: 8 }}>
        <Link href="/inbox" className="btn-ghost btn-sm">←</Link>
        <Link
          href={"/u/" + peerId}
          style={{ flex: 1, textDecoration: "none", color: "inherit", minWidth: 0 }}
        >
          <div style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName(peer || {}) || "Chat"}
          </div>
          <div className="muted" style={{ fontSize: 10 }}>
            {streak > 0 ? `🔥 ${streak}-day chat streak` : "Campus DM"}
          </div>
        </Link>
        {/* 2–3 Audio / Video call */}
        <button type="button" className="btn-ghost btn-sm" title="Audio call" onClick={() => doCall("audio")}>
          📞
        </button>
        <button type="button" className="btn-ghost btn-sm" title="Video call" onClick={() => doCall("video")}>
          📹
        </button>
      </div>

      {callErr && (
        <div className="fail" style={{ margin: "8px 12px", fontSize: 12 }}>
          {callErr}
        </div>
      )}

      {/* 4 In-chat call embed */}
      {callUrl && (
        <div style={{ height: "40vh", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
          <iframe title="call" src={callUrl} style={{ width: "100%", height: "100%", border: 0 }} allow="camera; microphone; fullscreen; display-capture" />
          <button
            type="button"
            className="btn btn-sm"
            style={{ position: "absolute", top: 8, right: 8, background: "#f43f5e" }}
            onClick={() => {
              setCallUrl(null);
              sessionStorage.removeItem("hatch_active_call_url");
            }}
          >
            End
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* 5 Context from I'm Free / Pulse */}
        {ctxBanner && (
          <div
            className="card"
            style={{
              marginBottom: 12,
              border: "1px solid rgba(16,185,129,0.35)",
              background: "rgba(16,185,129,0.1)",
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 800, opacity: 0.8 }}>
              {ctxFrom === "hostel"
                ? "HOSTEL"
                : ctxFrom === "pulse"
                  ? "FROM PULSE"
                  : "CONTEXT"}
            </p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{ctxBanner}</p>
          </div>
        )}

        {/* 6–10 Message bubbles: text, voice, gift, media */}
        {msgs.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div
              key={m.id}
              className={mine ? "bubble-me" : "bubble-them"}
              style={{ marginBottom: 8, cursor: "pointer" }}
              onDoubleClick={() => setReplyTo(m)}
              title="Double-tap to reply"
            >
              {m.media_type === "audio" && m.media_url ? (
                <audio controls src={m.media_url} style={{ maxWidth: "100%", height: 36 }} />
              ) : m.media_url ? (
                <a href={m.media_url} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
                  📎 Attachment
                </a>
              ) : (
                <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
              )}
              <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4 }}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {mine && m.read_at ? " · Read" : mine ? " · Sent" : ""}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {/* 11 Reply preview */}
      {replyTo && (
        <div className="row" style={{ padding: "6px 12px", gap: 8, borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(139,92,246,0.1)" }}>
          <span className="muted" style={{ fontSize: 11, flex: 1 }}>
            Replying: {String(replyTo.content || "media").slice(0, 60)}
          </span>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setReplyTo(null)}>
            ✕
          </button>
        </div>
      )}

      {/* 12 Quick replies */}
      {showQuick && (
        <div className="row" style={{ padding: "8px 12px", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {QUICK.map((q) => (
            <button key={q} type="button" className="chip" style={{ fontSize: 11 }} onClick={() => sendText(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 13 Gifts tray */}
      {showGifts && (
        <div className="row" style={{ padding: "10px 12px", gap: 8, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {GIFTS.map((g) => (
            <button key={g.id} type="button" className="chip" onClick={() => sendGift(g)}>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      )}

      {/* 14 Reactions row */}
      <div className="row" style={{ padding: "4px 12px", gap: 4, justifyContent: "center" }}>
        {REACTIONS.map((e) => (
          <button key={e} type="button" style={{ fontSize: 18, padding: 4 }} onClick={() => sendReaction(e)}>
            {e}
          </button>
        ))}
      </div>

      {/* 15–20 Composer: voice, gift, quick, copy, send */}
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 6, alignItems: "center" }}>
        <button type="button" className="btn-ghost btn-sm" title="Voice note" onClick={() => (recording ? stopVoice() : startVoice())}>
          {recording ? "⏹" : "🎤"}
        </button>
        <button type="button" className="btn-ghost btn-sm" title="Gift" onClick={() => { setShowGifts((v) => !v); setShowQuick(false); }}>
          🎁
        </button>
        <button type="button" className="btn-ghost btn-sm" title="Quick" onClick={() => { setShowQuick((v) => !v); setShowGifts(false); }}>
          ⚡
        </button>
        <button type="button" className="btn-ghost btn-sm" title="Copy link" onClick={copyChatLink}>
          🔗
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={recording ? "Recording…" : "Message…"}
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendText()}
          disabled={recording}
        />
        <button className="btn btn-sm" onClick={() => sendText()} disabled={!text.trim() || recording}>
          Send
        </button>
      </div>
    </div>
  );
}
