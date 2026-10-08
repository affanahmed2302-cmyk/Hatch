"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, rateLimit } from "@/lib/supabase";
import { haptic, playPing, bumpChatStreak, getChatStreak, markMessagesRead, bumpDaily } from "@/lib/obsession";
import { ensureNotifyPermission } from "@/lib/notify";

export default function ChatPage() {
  const { id: peerId } = useParams<{ id: string }>();
  const [myId, setMyId] = useState<string | null>(null);
  const [peer, setPeer] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [ctxBanner, setCtxBanner] = useState<string | null>(null);
  const [ctxFrom, setCtxFrom] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
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
      } catch {}
      const { data: p } = await supabase.from("profiles").select("id, full_name, username, avatar_url").eq("id", peerId).maybeSingle();
      setPeer(p);
      await loadMsgs(user.id);
      await markMessagesRead(user.id, peerId);
      setLoading(false);
    })();
  }, [peerId, router]);

  async function loadMsgs(uid: string) {
    const { data } = await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${uid})`)
      .order("created_at", { ascending: true }).limit(200);
    setMsgs(data || []);
    setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    if (!myId || !peerId) return;
    const room = "dm-" + [myId, peerId].sort().join("-");
    const ch = supabase.channel(room)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async () => {
        await loadMsgs(myId); haptic(8); playPing();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, peerId]);

  async function send(content?: string) {
    if (!myId) return;
    const body = (content ?? text).trim();
    if (!body) return;
    if (!(await rateLimit("msg:" + myId, 40, 60000))) return;
    setText("");
    await supabase.from("messages").insert({ sender_id: myId, receiver_id: peerId, content: body });
    await bumpDaily(myId);
    await bumpChatStreak(myId, peerId);
    await loadMsgs(myId);
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
      <div className="topbar">
        <Link href="/inbox" className="btn-ghost btn-sm">←</Link>
        <Link href={"/u/" + peerId} style={{ flex: 1, textDecoration: "none", color: "inherit", fontWeight: 800 }}>
          {displayName(peer || {}) || "Chat"}
        </Link>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {ctxBanner && (
          <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.1)" }}>
            <p style={{ fontSize: 11, fontWeight: 800, opacity: 0.8 }}>
              {ctxFrom === "hostel" ? "HOSTEL CHAT" : ctxFrom === "pulse" ? "FROM PULSE" : "CONTEXT"}
            </p>
            <p style={{ fontSize: 13, marginTop: 4 }}>{ctxBanner}</p>
            <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Prefill below — edit or send</p>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={m.sender_id === myId ? "bubble-me" : "bubble-them"} style={{ marginBottom: 8 }}>
            {m.content}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn btn-sm" onClick={() => send()} disabled={!text.trim()}>Send</button>
      </div>
    </div>
  );
}
