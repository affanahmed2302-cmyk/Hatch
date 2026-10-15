"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, rateLimit } from "@/lib/supabase";
import { haptic, playPing, bumpChatStreak, markMessagesRead, bumpDaily } from "@/lib/obsession";
import { ensureNotifyPermission } from "@/lib/notify";
import { startCall, callEmbedUrl, type CallRow } from "@/lib/calls";

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

/** Clean DM — IG/WA style: name, text, voice, call. No clutter. */
export default function ChatPage() {
  const { id: peerId } = useParams<{ id: string }>();
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState("Hatch");
  const [peer, setPeer] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [callUrl, setCallUrl] = useState<string | null>(null);
  const [callErr, setCallErr] = useState("");
  const [online, setOnline] = useState(false);
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
        if (q.get("call") === "1") {
          const u = sessionStorage.getItem("hatch_active_call_url");
          if (u) setCallUrl(u);
        }
        const ctx = q.get("ctx");
        if (ctx) setText(decodeURIComponent(ctx).slice(0, 160));
      } catch {
        /* */
      }

      const { data: me } = await supabase
        .from("profiles")
        .select("full_name, username, email")
        .eq("id", user.id)
        .maybeSingle();
      setMyName(displayName(me || {}) || "Hatch");

      // Always fetch name fields so header never says Unknown
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, avatar_url, last_seen, department")
        .eq("id", peerId)
        .maybeSingle();
      setPeer(p);
      if (p?.last_seen) {
        setOnline(Date.now() - new Date(p.last_seen).getTime() < 3 * 60 * 1000);
      }

      await loadMsgs(user.id);
      await markMessagesRead(user.id, peerId);
      try {
        await bumpChatStreak(user.id, peerId);
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

  async function send(body?: string) {
    if (!myId) return;
    const content = (body ?? text).trim();
    if (!content) return;
    if (!rateLimit("msg:" + myId, 50, 60000)) return;
    setText("");
    await supabase.from("messages").insert({
      sender_id: myId,
      receiver_id: peerId,
      content,
    });
    await bumpDaily(myId, "messages");
    await bumpChatStreak(myId, peerId);
    await loadMsgs(myId);
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
        if (blob.size < 200 || !myId) return;
        const path = `voice/${myId}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from("chat-media").upload(path, blob, {
          contentType: "audio/webm",
          upsert: false,
        });
        if (error) {
          await send("🎤 Voice note");
          return;
        }
        const { data: pub } = supabase.storage.from("chat-media").getPublicUrl(path);
        await supabase.from("messages").insert({
          sender_id: myId,
          receiver_id: peerId,
          content: "🎤 Voice note",
          media_url: pub.publicUrl,
          media_type: "audio",
        });
        await loadMsgs(myId);
      };
      mediaRec.current = rec;
      rec.start();
      setRecording(true);
      haptic(12);
    } catch {
      setCallErr("Allow microphone for voice notes");
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
    // Request mic/cam before joining — like WA
    try {
      await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      }).then((s) => s.getTracks().forEach((t) => t.stop()));
    } catch {
      setCallErr("Allow mic" + (type === "video" ? " & camera" : "") + " to call");
      return;
    }
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

  const peerName = displayName(peer || {});

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  // Full-screen call — no extra login, just End (WA style)
  if (callUrl) {
    return (
      <div className="shell" style={{ padding: 0, height: "100dvh", display: "flex", flexDirection: "column" }}>
        <div
          className="topbar"
          style={{
            background: "linear-gradient(90deg,rgba(16,185,129,0.25),rgba(139,92,246,0.2))",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{peerName}</div>
            <div className="muted" style={{ fontSize: 11 }}>In call · stay on this screen</div>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: "#f43f5e", color: "#fff" }}
            onClick={() => {
              setCallUrl(null);
              sessionStorage.removeItem("hatch_active_call_url");
            }}
          >
            End
          </button>
        </div>
        <iframe
          title="call"
          src={callUrl}
          style={{ flex: 1, width: "100%", border: 0, background: "#000" }}
          allow="camera; microphone; fullscreen; autoplay; display-capture"
        />
      </div>
    );
  }

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      {/* Header — name always visible */}
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
              boxShadow: online ? "0 0 0 2px #34d399" : undefined,
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
              {online ? "Active now" : peer?.department || "Campus"}
            </div>
          </div>
        </Link>
        <button type="button" className="btn-ghost btn-sm" aria-label="Audio call" onClick={() => doCall("audio")}>
          📞
        </button>
        <button type="button" className="btn-ghost btn-sm" aria-label="Video call" onClick={() => doCall("video")}>
          📹
        </button>
      </div>

      {callErr && (
        <div className="fail" style={{ margin: "8px 12px", fontSize: 12 }}>
          {callErr}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                margin: "0 auto 12px",
                background: peer?.avatar_url
                  ? `url(${peer.avatar_url}) center/cover`
                  : "linear-gradient(135deg,#8b5cf6,#ec4899)",
              }}
            />
            <div style={{ fontWeight: 800, fontSize: 17 }}>{peerName}</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Say hi — keep it real, keep it campus
            </p>
          </div>
        )}
        {msgs.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div
              key={m.id}
              className={mine ? "bubble-me" : "bubble-them"}
              style={{ marginBottom: 6 }}
            >
              {m.media_type === "audio" && m.media_url ? (
                <audio controls src={m.media_url} style={{ maxWidth: 220, height: 36 }} />
              ) : (
                <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
              )}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {/* Composer — only essentials */}
      <div
        style={{
          padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "rgba(7,7,12,0.92)",
        }}
      >
        <button
          type="button"
          className="btn-ghost btn-sm"
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            padding: 0,
            background: recording ? "rgba(244,63,94,0.25)" : undefined,
          }}
          onClick={() => (recording ? stopVoice() : startVoice())}
          aria-label={recording ? "Stop recording" : "Voice note"}
        >
          {recording ? "⏹" : "🎤"}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={recording ? "Recording…" : "Message"}
          style={{
            flex: 1,
            borderRadius: 22,
            padding: "12px 16px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          disabled={recording}
        />
        <button
          className="btn btn-sm"
          style={{ borderRadius: "50%", width: 44, height: 44, padding: 0 }}
          onClick={() => send()}
          disabled={!text.trim() || recording}
          aria-label="Send"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
