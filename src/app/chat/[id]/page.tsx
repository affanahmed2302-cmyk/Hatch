"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, jitsiRoom, jitsiEmbedUrl } from "@/lib/supabase";
import { hasChatLock, isChatUnlocked, unlockChat, isChatLocked } from "@/lib/chatLock";

export default function ChatPage() {
  const { id: peerId } = useParams<{ id: string }>();
  const [myId, setMyId] = useState<string | null>(null);
  const [peer, setPeer] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [needPin, setNeedPin] = useState(false);
  const [pin, setPin] = useState("");
  const [callUrl, setCallUrl] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      if (hasChatLock() && isChatLocked(peerId) && !isChatUnlocked()) {
        setNeedPin(true);
        setLoading(false);
        return;
      }
      const { data: p } = await supabase.from("profiles").select("id, full_name, username").eq("id", peerId).maybeSingle();
      setPeer(p);
      await loadMsgs(user.id);
      setLoading(false);
    })();
  }, [peerId, router]);

  async function loadMsgs(uid: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${uid})`)
      .order("created_at", { ascending: true })
      .limit(100);
    setMsgs(data || []);
    setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    if (!myId || !peerId) return;
    const ch = supabase
      .channel(`dm-${[myId, peerId].sort().join("-")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadMsgs(myId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, peerId]);

  async function send() {
    if (!myId || !text.trim()) return;
    const content = text.trim();
    setText("");
    await supabase.from("messages").insert({
      sender_id: myId, receiver_id: peerId, content,
    });
    await loadMsgs(myId);
  }

  function startCall(audioOnly: boolean) {
    const room = jitsiRoom("dm", [myId, peerId].sort().join(""));
    setCallUrl(jitsiEmbedUrl(room, audioOnly, displayName(peer || {})));
  }

  if (needPin) {
    return (
      <div className="shell" style={{ padding: 24 }}>
        <h1 className="h1">Locked chat</h1>
        <input type="password" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} style={{ margin: "12px 0" }} />
        <button className="btn" onClick={() => {
          if (unlockChat(pin)) { setNeedPin(false); window.location.reload(); }
        }}>Unlock</button>
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

  if (callUrl) {
    return (
      <div className="shell" style={{ padding: 0, paddingBottom: 0 }}>
        <div className="topbar">
          <button className="btn-ghost btn-sm" onClick={() => setCallUrl(null)}>End call</button>
        </div>
        <iframe src={callUrl} style={{ width: "100%", height: "calc(100dvh - 56px)", border: 0 }} allow="camera; microphone; fullscreen; display-capture" />
      </div>
    );
  }

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", paddingBottom: 0 }}>
      <div className="topbar">
        <Link href="/inbox" className="btn-ghost btn-sm">←</Link>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <div className="h2">{displayName(peer || {})}</div>
        </div>
        <button className="btn-ghost btn-sm" onClick={() => startCall(true)}>Audio</button>
        <button className="btn-ghost btn-sm" onClick={() => startCall(false)}>Video</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {msgs.map(m => (
          <div key={m.id} className={m.sender_id === myId ? "bubble-me" : "bubble-them"} style={{ marginBottom: 8 }}>
            {m.content}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="row" style={{ padding: 12, borderTop: "1px solid var(--border)", gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Message…"
          style={{ flex: 1 }}
        />
        <button className="btn btn-sm" onClick={send} disabled={!text.trim()}>Send</button>
      </div>
    </div>
  );
}
