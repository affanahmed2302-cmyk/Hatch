"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, rateLimit, isSuperAdmin } from "@/lib/supabase";
import { haptic, playPing } from "@/lib/obsession";
import {
  checkAnonMessage,
  isAnonBanned,
  isAppBanned,
  banFromAnon,
  banFromApp,
  saveAnonConsent,
  hasLocalAnonConsent,
  anonLabel,
  ANON_CONSENT_POINTS,
} from "@/lib/anonLounge";

const GENERAL_CHANNELS = [
  { id: "general", label: "# general", desc: "Campus talk · real names" },
  { id: "placements", label: "# placements", desc: "Internships & jobs" },
  { id: "hackathons", label: "# hackathons", desc: "Teams & events" },
  { id: "study", label: "# study-help", desc: "Doubts & notes" },
  { id: "random", label: "# random", desc: "Memes & chill" },
];

type Mode = "general" | "anonymous";

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
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("general");
  const [channel, setChannel] = useState("general");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [showChannels, setShowChannels] = useState(false);
  const [consentOk, setConsentOk] = useState(false);
  const [consentChecks, setConsentChecks] = useState<boolean[]>(() => ANON_CONSENT_POINTS.map(() => false));
  const [anonBanned, setAnonBanned] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const admin = isSuperAdmin(email);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      if (await isAppBanned(user.id)) {
        setErr("Your account has been restricted. Contact support if this is a mistake.");
        setLoading(false);
        return;
      }
      setMyId(user.id);
      setEmail(user.email || "");
      setConsentOk(hasLocalAnonConsent());
      setAnonBanned(await isAnonBanned(user.id));
      setLoading(false);
    })();
  }, [router]);

  const activeChannel = mode === "anonymous" ? "anonymous" : channel;

  async function loadMsgs(ch: string) {
    const { data, error } = await supabase
      .from("lounge_messages")
      .select("id, sender_id, channel, content, created_at")
      .eq("channel", ch)
      .order("created_at", { ascending: true })
      .limit(120);
    if (error) {
      if (error.message.includes("lounge_messages") || error.code === "42P01") {
        setErr("Run hatch_lounge.sql in Supabase");
      }
      setMsgs([]);
      return;
    }
    if (!data?.length) { setMsgs([]); return; }

    if (ch === "anonymous") {
      // Never attach real profiles
      setMsgs(data.map((m) => ({ ...m, profile: null })));
      return;
    }

    const ids = [...new Set(data.map((m) => m.sender_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", ids);
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
    setMsgs(data.map((m) => ({ ...m, profile: map[m.sender_id] })));
  }

  useEffect(() => {
    if (!myId) return;
    if (mode === "anonymous" && (!consentOk || anonBanned)) return;
    loadMsgs(activeChannel);
    const room = `lounge-${activeChannel}`;
    const ch = supabase
      .channel(room)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lounge_messages", filter: `channel=eq.${activeChannel}` },
        () => {
          loadMsgs(activeChannel);
          haptic(6);
          playPing();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, activeChannel, mode, consentOk, anonBanned]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function acceptConsent() {
    if (!consentChecks.every(Boolean)) {
      setErr("Tick every consent point to continue");
      return;
    }
    if (!myId) return;
    await saveAnonConsent(myId);
    setConsentOk(true);
    setErr("");
    setMsg("Welcome — stay kind. You’re anonymous here.");
  }

  async function send() {
    if (!myId || !text.trim()) return;
    setErr("");

    if (mode === "anonymous") {
      if (anonBanned) {
        setErr("You’re banned from Anonymous Lounge");
        return;
      }
      const check = checkAnonMessage(text);
      if (!check.ok) {
        setErr(check.error || "Blocked");
        return;
      }
    }

    if (!(await rateLimit("lounge:" + myId, 20, 60000))) {
      setErr("Slow down — too many messages");
      return;
    }

    const body = text.trim().slice(0, mode === "anonymous" ? 500 : 1000);
    setText("");
    const { error } = await supabase.from("lounge_messages").insert({
      sender_id: myId,
      channel: activeChannel,
      content: body,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    await loadMsgs(activeChannel);
    haptic(8);
  }

  async function adminBan(senderId: string, fullApp: boolean) {
    if (!myId || !admin || senderId === myId) return;
    if (!confirm(fullApp ? "Ban from entire Hatch app?" : "Ban from Anonymous Lounge only?")) return;
    if (fullApp) {
      const r = await banFromApp(senderId);
      setMsg(r.ok ? "User banned from app" : r.error || "Failed");
    } else {
      const r = await banFromAnon(senderId, myId, "Anonymous lounge violation");
      setMsg(r.ok ? "User banned from Anonymous Lounge" : r.error || "Failed");
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setErr("");
    setShowChannels(false);
    if (m === "general") setChannel("general");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading lounge…</span>
      </div>
    );
  }

  // Consent gate for anonymous
  if (mode === "anonymous" && !consentOk) {
    return (
      <div className="shell">
        <div className="topbar">
          <button type="button" className="btn-ghost btn-sm" onClick={() => switchMode("general")}>← General</button>
          <div className="logo" style={{ fontSize: 15 }}>Anonymous · Consent</div>
        </div>
        <div className="page">
          <div className="card" style={{ border: "1px solid rgba(251,191,36,0.4)", background: "linear-gradient(160deg,rgba(251,191,36,0.12),rgba(22,22,32,0.9))" }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Before you enter</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Safe space to ask anything without losing face — stress, studies, feelings, campus life.
              Read and accept every point.
            </p>
          </div>
          {err && <div className="fail" style={{ margin: "10px 0" }}>{err}</div>}
          {ANON_CONSENT_POINTS.map((line, i) => (
            <label
              key={i}
              className="card"
              style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8, cursor: "pointer", padding: 12 }}
            >
              <input
                type="checkbox"
                checked={consentChecks[i]}
                onChange={(e) => {
                  const next = [...consentChecks];
                  next[i] = e.target.checked;
                  setConsentChecks(next);
                }}
                style={{ marginTop: 3 }}
              />
              <span style={{ fontSize: 13, lineHeight: 1.4 }}>{line}</span>
            </label>
          ))}
          <button
            type="button"
            className="btn"
            style={{ width: "100%", marginTop: 8 }}
            onClick={acceptConsent}
            disabled={!consentChecks.every(Boolean)}
          >
            I agree — enter Anonymous Lounge
          </button>
          <p className="muted" style={{ fontSize: 11, marginTop: 12, textAlign: "center" }}>
            Breaking rules = permanent ban from anonymous chat; serious abuse = ban from Hatch.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "anonymous" && anonBanned) {
    return (
      <div className="shell">
        <div className="topbar">
          <button type="button" className="btn-ghost btn-sm" onClick={() => switchMode("general")}>← General</button>
          <div className="logo" style={{ fontSize: 15 }}>Anonymous</div>
        </div>
        <div className="page">
          <div className="fail">You are permanently removed from Anonymous Lounge for policy violations.</div>
          <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>You can still use General Lounge and the rest of Hatch (unless app-banned).</p>
          <button type="button" className="btn" style={{ marginTop: 16 }} onClick={() => switchMode("general")}>Go to General chat</button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="logo" style={{ fontSize: 15 }}>Lounge</div>
        </div>
        {mode === "general" && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setShowChannels(!showChannels)}>#</button>
        )}
      </div>

      {/* Mode switcher */}
      <div className="row" style={{ gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          type="button"
          className={mode === "general" ? "chip on" : "chip"}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => switchMode("general")}
        >
          General
        </button>
        <button
          type="button"
          className={mode === "anonymous" ? "chip on" : "chip"}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => switchMode("anonymous")}
        >
          Anonymous
        </button>
      </div>

      {mode === "anonymous" && (
        <div style={{ padding: "8px 14px", background: "rgba(251,191,36,0.1)", borderBottom: "1px solid rgba(251,191,36,0.2)", fontSize: 11 }}>
          Identity hidden · Be respectful · No vulgar language · Admin can ban permanently
        </div>
      )}

      {showChannels && mode === "general" && (
        <div style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", maxHeight: 200, overflowY: "auto" }}>
          {GENERAL_CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={channel === c.id ? "chip on" : "chip"}
              style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6 }}
              onClick={() => { setChannel(c.id); setShowChannels(false); }}
            >
              <strong>{c.label}</strong>
              <span className="muted" style={{ fontSize: 11, display: "block" }}>{c.desc}</span>
            </button>
          ))}
        </div>
      )}

      {err && <div className="fail" style={{ margin: 8 }}>{err}</div>}
      {msg && <div className="ok" style={{ margin: 8 }}>{msg}</div>}

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {msgs.map((m) => {
          const mine = m.sender_id === myId;
          const label =
            mode === "anonymous"
              ? anonLabel(m.sender_id)
              : displayName(m.profile || {}) || "Student";
          return (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 4 }}>
                {mode === "general" && m.profile?.avatar_url ? (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `url(${m.profile.avatar_url}) center/cover` }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: mode === "anonymous" ? "linear-gradient(135deg,#57534e,#292524)" : "var(--grad-cool)",
                    fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                  }}>
                    {mode === "anonymous" ? "?" : (label[0] || "?").toUpperCase()}
                  </div>
                )}
                <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.85 }}>{mine && mode === "anonymous" ? "You (anonymous)" : label}</span>
                <span className="muted" style={{ fontSize: 10 }}>
                  {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              <div style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: mine ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                fontSize: 14,
                lineHeight: 1.45,
                marginLeft: 36,
              }}>
                {m.content}
              </div>
              {admin && mode === "anonymous" && !mine && (
                <div className="row" style={{ gap: 6, marginLeft: 36, marginTop: 4 }}>
                  <button type="button" className="btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => adminBan(m.sender_id, false)}>Ban anon</button>
                  <button type="button" className="btn-danger btn-sm" style={{ fontSize: 10 }} onClick={() => adminBan(m.sender_id, true)}>Ban app</button>
                </div>
              )}
            </div>
          );
        })}
        {!msgs.length && (
          <p className="muted" style={{ textAlign: "center", marginTop: 40, fontSize: 13 }}>
            {mode === "anonymous"
              ? "No messages yet. Ask anything respectfully — you’re anonymous."
              : "No messages yet. Say hi to campus."}
          </p>
        )}
        <div ref={bottom} />
      </div>

      <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === "anonymous" ? "Anonymous message…" : "Message #" + channel}
          maxLength={mode === "anonymous" ? 500 : 1000}
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button type="button" className="btn btn-sm" onClick={send} disabled={!text.trim()}>Send</button>
      </div>
    </div>
  );
}
