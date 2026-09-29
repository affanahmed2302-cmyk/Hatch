"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, rateLimit } from "@/lib/supabase";
import { hasChatLock, isChatUnlocked, unlockChat, isChatLocked } from "@/lib/chatLock";
import { startCall, endCall, respondCall, callEmbedUrl, type CallRow } from "@/lib/calls";
import { haptic, playPing, bumpChatStreak, getChatStreak, markMessagesRead, bumpDaily } from "@/lib/obsession";
import { blockUser, reportUser } from "@/lib/safety";

export default function ChatPage() {
  const { id: peerId } = useParams<{ id: string }>();
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState("Hatch");
  const [peer, setPeer] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [needPin, setNeedPin] = useState(false);
  const [pin, setPin] = useState("");
  const [callUrl, setCallUrl] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [ringingOut, setRingingOut] = useState(false);
  const [incoming, setIncoming] = useState<CallRow | null>(null);
  const [callErr, setCallErr] = useState("");
  const [streak, setStreak] = useState(0);
  const [peerTyping, setPeerTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      const { data: me } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
      setMyName(displayName(me || {}) || "Hatch");
      if (hasChatLock() && isChatLocked(peerId) && !isChatUnlocked()) {
        setNeedPin(true); setLoading(false); return;
      }
      const { data: p } = await supabase.from("profiles").select("id, full_name, username, avatar_url, department, intent, career_goal").eq("id", peerId).maybeSingle();
      setPeer(p);
      await loadMsgs(user.id);
      await markMessagesRead(user.id, peerId);
      setStreak(await getChatStreak(user.id, peerId));
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
    const room = `dm-${[myId, peerId].sort().join("-")}`;
    const ch = supabase.channel(room)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async () => {
        await loadMsgs(myId); await markMessagesRead(myId, peerId); haptic(8); playPing();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => loadMsgs(myId))
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.from === peerId) {
          setPeerTyping(true);
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setPeerTyping(false), 2000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, peerId]);

  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel("calls-live-" + myId)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, (payload) => {
        const row = (payload.new || payload.old) as CallRow;
        if (!row) return;
        if (row.callee_id === myId && row.status === "ringing" && row.caller_id === peerId) {
          setIncoming(row); haptic([30, 50, 30]); playPing();
        }
        if (row.callee_id === myId && (row.status === "ended" || row.status === "rejected")) setIncoming(null);
        if (row.caller_id === myId && row.id === callId) {
          if (row.status === "accepted") { setRingingOut(false); setCallUrl(callEmbedUrl(row, myName)); haptic(20); }
          else if (["rejected", "ended", "missed"].includes(row.status)) {
            setRingingOut(false); setCallId(null);
            if (row.status === "rejected") setCallErr("Call declined");
          }
        }
        if (callId && row.id === callId && row.status === "ended") {
          setCallUrl(null); setCallId(null); setRingingOut(false); setIncoming(null);
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, peerId, callId, myName]);

  function broadcastTyping() {
    if (!myId || !peerId) return;
    const room = `dm-${[myId, peerId].sort().join("-")}`;
    const ch = supabase.channel(room);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") ch.send({ type: "broadcast", event: "typing", payload: { from: myId } });
    });
  }

  async function send(content?: string) {
    const body = (content ?? text).trim();
    if (!myId || !body) return;
    if (!rateLimit("msg-" + peerId, 800)) return;
    setText("");
    await supabase.from("messages").insert({ sender_id: myId, receiver_id: peerId, content: body });
    setStreak(await bumpChatStreak(myId, peerId));
    await bumpDaily(myId, "messages");
    haptic(10);
    await loadMsgs(myId);
  }

  async function startVoice() {
    if (!myId || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        const path = myId + "/voice-" + Date.now() + ".webm";
        const { error } = await supabase.storage.from("chat-media").upload(path, file, { contentType: "audio/webm" });
        if (error) {
          setCallErr(error.message.includes("Bucket") || error.message.includes("not found") ? "Storage bucket chat-media missing" : error.message);
          setRecording(false);
          return;
        }
        const { data: pub } = supabase.storage.from("chat-media").getPublicUrl(path);
        await supabase.from("messages").insert({ sender_id: myId, receiver_id: peerId, content: "Voice note", media_url: pub.publicUrl });
        setStreak(await bumpChatStreak(myId, peerId));
        haptic(12);
        await loadMsgs(myId);
        setRecording(false);
      };
      mediaRec.current = rec;
      rec.start();
      setRecording(true);
    } catch { setCallErr("Microphone permission needed"); }
  }

  function stopVoice() { if (mediaRec.current && recording) mediaRec.current.stop(); }

  async function ring(audioOnly: boolean) {
    if (!myId) return;
    setCallErr("");
    const res = await startCall(myId, peerId, audioOnly ? "audio" : "video");
    if (!res.ok || !res.call) { setCallErr(res.error || "Could not start call"); return; }
    setCallId(res.call.id);
    setRingingOut(true);
  }

  async function cancelRing() { if (callId) await endCall(callId); setRingingOut(false); setCallId(null); }
  async function acceptIncoming() {
    if (!incoming) return;
    const res = await respondCall(incoming.id, true);
    if (!res.ok || !res.call) { setCallErr(res.error || "Could not accept"); return; }
    setIncoming(null); setCallId(res.call.id); setCallUrl(callEmbedUrl(res.call, myName));
  }
  async function declineIncoming() { if (!incoming) return; await respondCall(incoming.id, false); setIncoming(null); }
  async function hangup() { if (callId) await endCall(callId); setCallUrl(null); setCallId(null); setRingingOut(false); setIncoming(null); }
  async function doBlock() { if (!myId || !confirm("Block?")) return; await blockUser(myId, peerId); router.push("/inbox"); }
  async function doReport() { if (!myId) return; await reportUser(myId, peerId, "inappropriate"); setCallErr("Report submitted"); setMenuOpen(false); }

  if (needPin) return (<div className="shell" style={{ padding: 24 }}><h1 className="h1">Locked chat</h1><input type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} style={{ margin: "12px 0" }} /><button className="btn" onClick={() => { if (unlockChat(pin)) window.location.reload(); else setCallErr("Wrong PIN"); }}>Unlock</button></div>);
  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading...</span></div>;
  if (callUrl) return (<div className="shell" style={{ padding: 0 }}><div className="topbar"><span style={{ flex: 1 }}>In call</span><button className="btn btn-sm" style={{ background: "#f43f5e" }} onClick={hangup}>End</button></div><iframe src={callUrl} style={{ width: "100%", height: "calc(100dvh - 56px)", border: 0 }} allow="camera; microphone; fullscreen; autoplay" /></div>);
  if (ringingOut) return (<div className="shell" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}><p className="h2">{displayName(peer || {})}</p><p className="muted">Ringing…</p><button className="btn" style={{ background: "#f43f5e" }} onClick={cancelRing}>Cancel</button></div>);

  const ices = [
    `Hey — free for a quick ${peer?.intent || peer?.career_goal || "collab"} chat?`,
    `Hi! Anyone from ${peer?.department || "BMS"} free for a study sync this week?`,
    "What skill are you leveling hardest this semester?",
  ];

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", paddingBottom: 0 }}>
      {incoming && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 90, background: "linear-gradient(135deg,#8b5cf6,#ec4899)", padding: 16, color: "#fff" }}><p style={{ fontWeight: 700 }}>Incoming {incoming.call_type}</p><div className="row" style={{ gap: 10, marginTop: 10 }}><button className="btn btn-sm" style={{ background: "#34d399", color: "#000" }} onClick={acceptIncoming}>Accept</button><button className="btn btn-sm" style={{ background: "#f43f5e" }} onClick={declineIncoming}>Decline</button></div></div>)}
      <div className="topbar" style={{ gap: 8 }}>
        <Link href="/inbox" className="btn-ghost btn-sm">←</Link>
        <Link href={"/u/" + peerId} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: peer?.avatar_url ? `url(${peer.avatar_url}) center/cover` : "var(--grad-cool)" }} />
          <div style={{ minWidth: 0 }}>
            <div className="h2" style={{ fontSize: 15 }}>{displayName(peer || {})}</div>
            <span className="muted" style={{ fontSize: 11 }}>{peerTyping ? "typing…" : streak > 0 ? `🔥 ${streak} day` : "View profile"}</span>
          </div>
        </Link>
        <button className="btn-ghost btn-sm" onClick={() => ring(true)}>Audio</button>
        <button className="btn-ghost btn-sm" onClick={() => ring(false)}>Video</button>
        <div style={{ position: "relative" }}>
          <button className="btn-ghost btn-sm" onClick={() => setMenuOpen(!menuOpen)}>···</button>
          {menuOpen && (<div className="card" style={{ position: "absolute", right: 0, top: 36, zIndex: 60, minWidth: 160, padding: 8 }}><Link href={"/u/" + peerId} className="btn-ghost btn-sm" style={{ display: "block", width: "100%", textAlign: "left" }} onClick={() => setMenuOpen(false)}>Profile</Link><button className="btn-ghost btn-sm" style={{ display: "block", width: "100%", textAlign: "left" }} onClick={doReport}>Report</button><button className="btn-ghost btn-sm" style={{ display: "block", width: "100%", textAlign: "left", color: "#f43f5e" }} onClick={doBlock}>Block</button></div>)}
        </div>
      </div>
      {callErr && <div className="fail" style={{ margin: 12 }}>{callErr}</div>}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {msgs.length === 0 && (
          <div className="card" style={{ marginBottom: 12, background: "rgba(139,92,246,0.12)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Icebreakers</p>
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Tap to send — no dead chats</p>
            {ices.map((line, i) => (
              <button key={i} className="btn-ghost btn-sm" style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, whiteSpace: "normal", height: "auto", padding: "10px 12px" }} onClick={() => send(line)}>{line}</button>
            ))}
          </div>
        )}
        {msgs.map(m => (
          <div key={m.id} className={m.sender_id === myId ? "bubble-me" : "bubble-them"} style={{ marginBottom: 8 }}>
            {m.media_url ? <audio controls src={m.media_url} style={{ maxWidth: "100%", height: 36 }} /> : m.content}
            {m.sender_id === myId && m.read_at && <span style={{ display: "block", fontSize: 10, opacity: 0.7 }}>Seen</span>}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="row" style={{ padding: 12, borderTop: "1px solid var(--border)", gap: 8 }}>
        <button type="button" className="btn-ghost btn-sm" style={{ minWidth: 44, height: 44, borderRadius: 22, background: recording ? "#f43f5e" : "rgba(139,92,246,0.2)" }} onClick={recording ? stopVoice : startVoice}>{recording ? "■" : "🎤"}</button>
        <input value={text} onChange={e => { setText(e.target.value); broadcastTyping(); }} onKeyDown={e => e.key === "Enter" && send()} placeholder="Message..." style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={() => send()} disabled={!text.trim()}>Send</button>
      </div>
    </div>
  );
}
