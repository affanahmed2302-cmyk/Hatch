"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, rateLimit, isRecentlyOnline } from "@/lib/supabase";
import { haptic, playPing } from "@/lib/obsession";

const CHANNELS = [
  { id: "general", label: "# general", desc: "Everyone · campus talk" },
  { id: "placements", label: "# placements", desc: "Internships & jobs" },
  { id: "hackathons", label: "# hackathons", desc: "Teams & events" },
  { id: "study", label: "# study-help", desc: "Doubts & notes" },
  { id: "random", label: "# random", desc: "Memes & chill" },
];

type Msg = {
  id: string;
  sender_id: string;
  channel: string;
  content: string;
  created_at: string;
  profile?: any;
};

export default function LoungePage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [channel, setChannel] = useState("general");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [err, setErr] = useState("");
  const [showChannels, setShowChannels] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen", since);
      setOnlineCount(count || 0);
      setLoading(false);
    })();
  }, [router]);

  async function loadMsgs(ch: string) {
    const { data, error } = await supabase
      .from("lounge_messages")
      .select("id, sender_id, channel, content, created_at")
      .eq("channel", ch)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      if (error.message.includes("lounge_messages") || error.code === "42P01") {
        setErr("Lounge table missing — run hatch_lounge.sql in Supabase");
      }
      setMsgs([]);
      return;
    }
    if (!data?.length) { setMsgs([]); return; }
    const ids = [...new Set(data.map((m) => m.sender_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, department, last_seen")
      .in("id", ids);
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
    setMsgs(data.map((m) => ({ ...m, profile: map[m.sender_id] })));
    setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 40);
  }

  useEffect(() => {
    if (!myId) return;
    loadMsgs(channel);
    const ch = supabase
      .channel("lounge-" + channel)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lounge_messages", filter: `channel=eq.${channel}` },
        async () => {
          await loadMsgs(channel);
          haptic(6);
          playPing();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, channel]);

  async function send() {
    const body = text.trim();
    if (!myId || !body) return;
    if (body.length > 500) { setErr("Max 500 chars"); return; }
    if (!rateLimit("lounge-" + channel, 1200)) { setErr("Slow down a sec…"); return; }
    setText("");
    setErr("");
    const { error } = await supabase.from("lounge_messages").insert({
      sender_id: myId,
      channel,
      content: body,
    });
    if (error) {
      setErr(
        error.message.includes("lounge_messages") || error.code === "42P01"
          ? "Run hatch_lounge.sql in Supabase first"
          : error.message
      );
      setText(body);
      return;
    }
    haptic(8);
    await loadMsgs(channel);
    inputRef.current?.focus();
  }

  function timeLabel(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const chMeta = CHANNELS.find((c) => c.id === channel) || CHANNELS[0];

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading lounge…</span>
      </div>
    );
  }

  return (
    <div
      className="shell"
      style={{
        display: "flex",
        flexDirection: "column",
        paddingBottom: 0,
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
      }}
    >
      <div className="topbar" style={{ gap: 8, flexShrink: 0 }}>
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <button
          className="btn-ghost btn-sm"
          style={{ flex: 1, textAlign: "left", minWidth: 0 }}
          onClick={() => setShowChannels(!showChannels)}
        >
          <div style={{ fontWeight: 800, fontSize: 15 }}>{chMeta.label}</div>
          <div className="muted" style={{ fontSize: 11 }}>
            {onlineCount > 0 ? `${onlineCount} online · ` : ""}{chMeta.desc} · tap channels
          </div>
        </button>
      </div>

      {showChannels && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setShowChannels(false)}
        >
          <div
            className="card"
            style={{ width: "100%", borderRadius: "20px 20px 0 0", margin: 0, padding: 16, maxHeight: "70dvh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h2" style={{ marginBottom: 12 }}>Campus channels</div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              Like Discord · every BMS student · no match needed
            </p>
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                className={channel === c.id ? "btn" : "btn-ghost"}
                style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 8, padding: "12px 14px" }}
                onClick={() => { setChannel(c.id); setShowChannels(false); }}
              >
                <div style={{ fontWeight: 700 }}>{c.label}</div>
                <div className="muted" style={{ fontSize: 12 }}>{c.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", minHeight: 0 }}>
        <div className="card" style={{ marginBottom: 14, background: "linear-gradient(135deg,rgba(88,101,242,0.25),rgba(124,58,237,0.12))" }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Campus Lounge · open chat</p>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Type below and hit Send. Switch channel from the title.
          </p>
        </div>

        {msgs.length === 0 && !err && (
          <div className="empty" style={{ padding: "24px 8px" }}>
            <p style={{ fontWeight: 700 }}>Be the first in {chMeta.label}</p>
            <p className="muted" style={{ fontSize: 13 }}>Say hi — message box is at the bottom</p>
          </div>
        )}

        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const showHead = !prev || prev.sender_id !== m.sender_id;
          const mine = m.sender_id === myId;
          const online = isRecentlyOnline(m.profile?.last_seen);
          return (
            <div key={m.id} style={{ marginBottom: showHead ? 12 : 4, display: "flex", gap: 10, alignItems: "flex-start" }}>
              {showHead ? (
                <Link href={"/u/" + m.sender_id} style={{ flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: m.profile?.avatar_url ? `url(${m.profile.avatar_url}) center/cover` : "var(--grad-cool)",
                    boxShadow: online ? "0 0 0 2px #34d399" : undefined,
                  }} />
                </Link>
              ) : <div style={{ width: 36, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                {showHead && (
                  <div className="row" style={{ gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                    <Link href={"/u/" + m.sender_id} style={{ fontWeight: 700, fontSize: 13, textDecoration: "none", color: mine ? "#a78bfa" : "inherit" }}>
                      {displayName(m.profile || {})}
                    </Link>
                    {m.profile?.department && (
                      <span className="muted" style={{ fontSize: 11 }}>{m.profile.department}</span>
                    )}
                    <span className="muted" style={{ fontSize: 11 }}>{timeLabel(m.created_at)}</span>
                  </div>
                )}
                <p style={{ fontSize: 14, lineHeight: 1.45, wordBreak: "break-word" }}>{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {err && <div className="fail" style={{ margin: "0 12px 8px", flexShrink: 0 }}>{err}</div>}

      <div
        className="row"
        style={{
          padding: "12px 12px calc(12px + env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--border)",
          gap: 8,
          flexShrink: 0,
          background: "rgba(7,7,12,0.95)",
        }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Type a message…"
          maxLength={500}
          style={{ flex: 1 }}
          autoComplete="off"
        />
        <button className="btn btn-sm" onClick={send} disabled={!text.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
