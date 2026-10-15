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
  const [consentChecks, setConsentChecks] = useState<boolean[]>(() =>
    ANON_CONSENT_POINTS.map(() => false)
  );
  const [anonBanned, setAnonBanned] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const admin = isSuperAdmin(email);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
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
    if (!data?.length) {
      setMsgs([]);
      return;
    }
    if (ch === "anonymous") {
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
        {
          event: "INSERT",
          schema: "public",
          table: "lounge_messages",
          filter: `channel=eq.${activeChannel}`,
        },
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
    if (!rateLimit("lounge:" + myId, 20, 60000)) {
      setErr("Slow down — too many messages");
      return;
    }
    const content = text.trim().slice(0, mode === "anonymous" ? 500 : 1000);
    const { error } = await supabase.from("lounge_messages").insert({
      sender_id: myId,
      channel: activeChannel,
      content,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setText("");
    haptic(8);
    playPing();
  }

  async function adminBan(senderId: string, fullApp: boolean) {
    if (!myId || !admin || senderId === myId) return;
    if (fullApp) {
      const r = await banFromApp(senderId);
      setMsg(r?.ok === false ? r.error || "Ban failed" : "Banned from app");
    } else {
      const r = await banFromAnon(senderId, myId, "Anonymous lounge violation");
      setMsg(r?.ok === false ? r.error || "Ban failed" : "Banned from anon");
    }
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  if (mode === "anonymous" && !consentOk) {
    return (
      <div className="shell" style={{ padding: 20 }}>
        <div className="topbar">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setMode("general")}>
            ← General
          </button>
          <div className="logo" style={{ fontSize: 16 }}>Anonymous Lounge</div>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Read and accept before posting anonymously.
        </p>
        {err && <div className="fail">{err}</div>}
        {ANON_CONSENT_POINTS.map((p, i) => (
          <label key={i} className="card row" style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={consentChecks[i]}
              onChange={(e) => {
                const next = [...consentChecks];
                next[i] = e.target.checked;
                setConsentChecks(next);
              }}
            />
            <span style={{ fontSize: 13 }}>{p}</span>
          </label>
        ))}
        <button type="button" className="btn" onClick={acceptConsent}>
          I agree — enter Anonymous
        </button>
      </div>
    );
  }

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <div className="topbar" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className={mode === "general" ? "btn btn-sm" : "btn-ghost btn-sm"}
            onClick={() => setMode("general")}
          >
            General
          </button>
          <button
            type="button"
            className={mode === "anonymous" ? "btn btn-sm" : "btn-ghost btn-sm"}
            onClick={() => setMode("anonymous")}
          >
            Anonymous
          </button>
        </div>
        {mode === "general" && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setShowChannels(!showChannels)}>
            {GENERAL_CHANNELS.find((c) => c.id === channel)?.label || "# general"}
          </button>
        )}
      </div>

      {showChannels && mode === "general" && (
        <div className="card" style={{ margin: 8 }}>
          {GENERAL_CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={channel === c.id ? "chip on" : "chip"}
              style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6 }}
              onClick={() => {
                setChannel(c.id);
                setShowChannels(false);
              }}
            >
              <strong>{c.label}</strong>
              <span className="muted" style={{ fontSize: 11, display: "block" }}>
                {c.desc}
              </span>
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
          const profileHref =
            mode === "general" && m.sender_id ? `/u/${m.sender_id}` : null;
          const avatarEl =
            mode === "general" && m.profile?.avatar_url ? (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: `url(${m.profile.avatar_url}) center/cover`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background:
                    mode === "anonymous"
                      ? "linear-gradient(135deg,#57534e,#292524)"
                      : "var(--grad-cool)",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {mode === "anonymous" ? "?" : (label[0] || "?").toUpperCase()}
              </div>
            );
          return (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 4 }}>
                {profileHref ? (
                  <Link
                    href={profileHref}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    {avatarEl}
                    <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.85 }}>{label}</span>
                  </Link>
                ) : (
                  <>
                    {avatarEl}
                    <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.85 }}>
                      {mine && mode === "anonymous" ? "You (anonymous)" : label}
                    </span>
                  </>
                )}
                <span className="muted" style={{ fontSize: 10 }}>
                  {m.created_at
                    ? new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: mine ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                  fontSize: 14,
                  lineHeight: 1.45,
                  marginLeft: 36,
                }}
              >
                {m.content}
              </div>
              {admin && mode === "anonymous" && !mine && (
                <div className="row" style={{ gap: 6, marginLeft: 36, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    style={{ fontSize: 10 }}
                    onClick={() => adminBan(m.sender_id, false)}
                  >
                    Ban anon
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    style={{ fontSize: 10 }}
                    onClick={() => adminBan(m.sender_id, true)}
                  >
                    Ban app
                  </button>
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
        <button type="button" className="btn btn-sm" onClick={send} disabled={!text.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
