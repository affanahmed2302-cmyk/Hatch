"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, postPulse, fetchPulseFeed, touchPresence } from "@/lib/supabase";
import { fetchFreeNow, setFreeNow, haptic, playPing } from "@/lib/obsession";
import { bumpOpenStreak, streakTier } from "@/lib/engagement";
import { fetchFeedEvents } from "@/lib/clubCore";
import { isMidnightBlackout, blackoutCountdown } from "@/lib/legendary";
import { ensureNotifyPermission } from "@/lib/notify";
import Nav from "@/components/Nav";

const PLACES = ["Library", "Canteen", "Nescafe", "Quad", "Main gate"];

const PLACE_EMOJI: Record<string, string> = {
  Library: "📚",
  Canteen: "🍽️",
  Nescafe: "☕",
  Quad: "🌳",
  "Main gate": "🚪",
};

const ACTIVITY_HINTS = [
  "Coffee + chill · join?",
  "Walk around campus",
  "Gym buddy for 30 min",
  "Food run · canteen",
  "Jam session / music",
  "Badminton / sports",
  "Movie plan after class",
  "Just free to talk",
];

const PULSE_CHIPS = [
  "🔥 Something wild just happened…",
  "☕ At Nescafe, good energy",
  "🎵 Song stuck in my head",
  "🏀 Anyone for a match?",
  "🌙 Night campus hits different",
  "😂 Random campus thought",
];

function timeAgo(iso?: string) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

export default function HomePage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pulse, setPulse] = useState<any[]>([]);
  const [free, setFree] = useState<any[]>([]);
  const [clubEvents, setClubEvents] = useState<any[]>([]);
  const [pulseText, setPulseText] = useState("");
  const [liveNote, setLiveNote] = useState("");
  const [livePlace, setLivePlace] = useState("Nescafe");
  const [streak, setStreak] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [blackout, setBlackout] = useState(false);
  const [cd, setCd] = useState("");
  const router = useRouter();

  async function refresh(uid: string) {
    const [f, p, ce] = await Promise.all([
      fetchFreeNow(),
      fetchPulseFeed(),
      fetchFeedEvents(5),
    ]);
    setFree(f);
    setPulse(p.ok ? p.data : []);
    setClubEvents(ce);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      touchPresence(user.id);
      ensureNotifyPermission();
      setStreak(await bumpOpenStreak(user.id));
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .maybeSingle();
      setName(prof?.full_name || prof?.username || "there");
      await refresh(user.id);
      setBlackout(isMidnightBlackout());
      setCd(blackoutCountdown());
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!myId) return;
    const id = window.setInterval(() => { void refresh(myId); }, 20000);
    return () => clearInterval(id);
  }, [myId]);

  async function goLive() {
    if (!myId) return;
    const note = liveNote.trim();
    const res = await setFreeNow(myId, livePlace, note || undefined);
    if (!res.ok) setErr(res.error || "Could not go live — check free_now table in Supabase");
    else {
      setMsg("You're visible for 15 min · friends can Ping you");
      haptic([10, 20, 10]);
      playPing();
      await refresh(myId);
    }
  }

  async function publishPulse() {
    if (!myId || !pulseText.trim()) return;
    const res = await postPulse(myId, pulseText);
    if (!res.ok) setErr(res.error || "Failed");
    else {
      setPulseText("");
      setMsg("Pulse dropped");
      haptic(8);
      await refresh(myId);
    }
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  const tier = streakTier(streak);
  const pulseList = Array.isArray(pulse) ? pulse : [];
  const first = (name || "there").split(" ")[0];

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">HATCH</div>
        <Link href="/settings" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>Settings</Link>
      </div>

      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="hero-card">
          <h1 className="h1" style={{ fontSize: 24, marginBottom: 6, position: "relative", zIndex: 1 }}>
            Hey {first} 👋
          </h1>
          <p className="muted" style={{ fontSize: 13, position: "relative", zIndex: 1 }}>
            {tier.emoji} <strong style={{ color: "#e9d5ff" }}>{streak}-day streak</strong>
            {" "}· your campus network is live
          </p>
          <div className="pill-row" style={{ position: "relative", zIndex: 1 }}>
            <span className="pill hot">BMSCE</span>
            <span className="pill">Online</span>
          </div>
        </div>

        <div className="section-label">Go somewhere</div>
        <div className="quick-grid">
          <Link href="/discover" className="quick-tile violet">
            <span className="qt-ico">◎</span>
            <div className="qt-title">Find people</div>
            <div className="qt-sub">Skills · teams · chat</div>
          </Link>
          <Link href="/lounge" className="quick-tile pink">
            <span className="qt-ico">◈</span>
            <div className="qt-title">Lounge</div>
            <div className="qt-sub">Open campus chat</div>
          </Link>
          <Link href="/inbox" className="quick-tile cyan">
            <span className="qt-ico">◇</span>
            <div className="qt-title">Messages</div>
            <div className="qt-sub">DMs & connections</div>
          </Link>
          <Link href="/clubs" className="quick-tile emerald">
            <span className="qt-ico">✦</span>
            <div className="qt-title">Clubs</div>
            <div className="qt-sub">Events & boards</div>
          </Link>
        </div>

        {blackout && (
          <Link href="/explore" className="card" style={{
            display: "block", marginBottom: 12, textDecoration: "none", color: "#e9d5ff",
            background: "linear-gradient(160deg,#1a0533,#0c0220)",
            border: "1px solid rgba(192,132,252,0.5)",
          }}>
            <div style={{ fontWeight: 800 }}>Midnight Blackout LIVE</div>
            <p className="muted" style={{ fontSize: 11 }}>{cd}</p>
          </Link>
        )}

        <div className="card" style={{
          marginBottom: 12,
          border: "1px solid rgba(52,211,153,0.4)",
          background: "linear-gradient(160deg,rgba(16,185,129,0.14),rgba(6,78,59,0.18))",
        }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>🟢 I'm Free</div>
              <p style={{ fontSize: 13, marginTop: 4, lineHeight: 1.4, color: "#d1fae5" }}>
                Tell campus you're free right now. People nearby (or online) tap <strong>Ping</strong> and chat opens.
              </p>
            </div>
            <span className="badge" style={{ background: "#10b981", color: "#fff" }}>{free.length} free</span>
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#a7f3d0",
              marginBottom: 12,
              padding: "8px 10px",
              borderRadius: 12,
              background: "rgba(0,0,0,0.2)",
              lineHeight: 1.45,
            }}
          >
            <strong>How it works</strong>
            <br />
            1 · Pick where you are
            <br />
            2 · Tap an activity (or type your own)
            <br />
            3 · Tap <strong>I'm free at …</strong> — visible 15 min
            <br />
            4 · Someone taps <strong>Ping</strong> → chat
          </div>

          <p className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Where are you?</p>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {PLACES.map((p) => (
              <button
                key={p}
                type="button"
                className={livePlace === p ? "chip on" : "chip"}
                onClick={() => setLivePlace(p)}
                style={{ borderColor: "rgba(52,211,153,0.4)" }}
              >
                {(PLACE_EMOJI[p] || "📍") + " " + p}
              </button>
            ))}
          </div>

          <p className="muted" style={{ fontSize: 11, marginBottom: 6 }}>What do you want to do?</p>
          <input
            value={liveNote}
            onChange={(e) => setLiveNote(e.target.value)}
            placeholder="e.g. Coffee + chill · join?"
            maxLength={120}
            style={{ marginBottom: 8 }}
          />
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {ACTIVITY_HINTS.map((h) => (
              <button
                key={h}
                type="button"
                className={liveNote === h ? "chip on" : "chip"}
                style={{ fontSize: 11, borderColor: "rgba(52,211,153,0.35)" }}
                onClick={() => setLiveNote(h)}
              >
                {h}
              </button>
            ))}
          </div>

          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={goLive}>
            I'm free at {livePlace}
          </button>

          {free.length > 0 && (
            <p className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
              Free now — list refreshes live · Ping to chat
            </p>
          )}

          {free.map((f: any) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
                padding: 12,
                borderRadius: 14,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(52,211,153,0.25)",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: f.profile?.avatar_url
                  ? `url(${f.profile.avatar_url}) center/cover`
                  : "var(--grad-cool)",
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{displayName(f.profile || {})}</div>
                <p style={{ fontSize: 13, marginTop: 2 }}>
                  {(PLACE_EMOJI[f.place] || "📍") + " "}
                  <strong style={{ color: "#6ee7b7" }}>{f.place}</strong>
                </p>
                {f.note && (
                  <p style={{ fontSize: 13, marginTop: 4, color: "#f5f5f7", lineHeight: 1.35 }}>
                    “{f.note}”
                  </p>
                )}
              </div>
              <Link
                href={"/chat/" + f.user_id}
                className="btn btn-sm"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", boxShadow: "none" }}
              >
                Ping
              </Link>
            </div>
          ))}
          {!free.length && (
            <p className="muted" style={{ fontSize: 12 }}>
              No one free yet — be first. Pick place + activity → I'm free at …
            </p>
          )}
        </div>

        {clubEvents.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Upcoming events</div>
            {clubEvents.slice(0, 3).map((ev) => (
              <div key={ev.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</div>
                {ev.venue && <p className="muted" style={{ fontSize: 11 }}>{ev.venue}</p>}
              </div>
            ))}
          </div>
        )}

        <div
          className="card"
          style={{
            marginBottom: 12,
            border: "1px solid rgba(167,139,250,0.35)",
            background:
              "linear-gradient(165deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1) 40%, rgba(22,22,32,0.85))",
          }}
        >
          <div className="row" style={{ marginBottom: 6, justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>⚡ Campus Pulse</div>
              <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                Anonymous campus energy · lasts a few hours
              </p>
            </div>
            <span className="badge">{pulseList.length} live</span>
          </div>

          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 16,
              background: "rgba(0,0,0,0.28)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <textarea
              value={pulseText}
              onChange={(e) => setPulseText(e.target.value)}
              placeholder="Drop a vibe for campus…"
              maxLength={200}
              rows={2}
              style={{
                marginBottom: 8,
                resize: "none",
                border: "none",
                background: "transparent",
                padding: 0,
              }}
            />
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {PULSE_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={pulseText === c ? "chip on" : "chip"}
                  style={{ fontSize: 11 }}
                  onClick={() => setPulseText(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted" style={{ fontSize: 11 }}>{pulseText.length}/200</span>
              <button className="btn btn-sm" onClick={publishPulse} disabled={!pulseText.trim()}>
                Drop pulse
              </button>
            </div>
          </div>

          {pulseList.slice(0, 10).map((p: any, i: number) => (
            <div
              key={p.id}
              style={{
                marginBottom: 10,
                padding: "12px 14px",
                borderRadius: 16,
                background: "rgba(0,0,0,0.22)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: `3px solid ${
                  ["#a855f7", "#ec4899", "#22d3ee", "#fbbf24"][i % 4]
                }`,
              }}
            >
              <p style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 500 }}>{p.content}</p>
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                <span className="muted" style={{ fontSize: 11 }}>
                  {p.is_anonymous !== false ? "Anonymous" : "Student"} · {timeAgo(p.created_at)}
                </span>
                {typeof p.likes === "number" && p.likes > 0 && (
                  <span className="badge" style={{ fontSize: 10 }}>♥ {p.likes}</span>
                )}
              </div>
            </div>
          ))}
          {!pulseList.length && (
            <div
              style={{
                textAlign: "center",
                padding: "20px 12px",
                borderRadius: 14,
                background: "rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>⚡</div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>No pulses yet</p>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Be the first — tap a chip or type your vibe
              </p>
            </div>
          )}
        </div>

        <Link href="/explore" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }}>
          More tools · Radar, Ghost, Clubs…
        </Link>
      </div>
      <Nav />
    </div>
  );
}
