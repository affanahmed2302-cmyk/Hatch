"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, postPulse, fetchPulseFeed, deletePulse, touchPresence } from "@/lib/supabase";
import { fetchFreeNow, setFreeNow, haptic, playPing } from "@/lib/obsession";
import { bumpOpenStreak, streakTier } from "@/lib/engagement";
import { fetchFeedEvents } from "@/lib/clubCore";
import { isMidnightBlackout, blackoutCountdown } from "@/lib/legendary";
import { ensureNotifyPermission } from "@/lib/notify";
import Nav from "@/components/Nav";

const PLACES = ["Library", "Canteen", "Nescafe", "Quad", "Main gate"];
const PLACE_EMOJI: Record<string, string> = { Library: "📚", Canteen: "🍽️", Nescafe: "☕", Quad: "🌳", "Main gate": "🚪" };
const ACTIVITY_HINTS = ["Coffee + chill · join?", "Walk around campus", "Gym buddy for 30 min", "Food run · canteen", "Jam session / music", "Badminton / sports", "Movie plan after class", "Just free to talk"];
const PULSE_CHIPS = ["🔥 Something wild just happened…", "☕ At Nescafe, good energy", "🎵 Song stuck in my head", "🏀 Anyone for a match?", "🌙 Night campus hits different", "😂 Random campus thought"];

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
  const [pulseMenu, setPulseMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blackout, setBlackout] = useState(false);
  const [cd, setCd] = useState("");
  const router = useRouter();

  async function refresh(uid: string) {
    const [f, p, ce] = await Promise.all([fetchFreeNow(), fetchPulseFeed(), fetchFeedEvents(5)]);
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
      const { data: prof } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
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
    if (!res.ok) setErr(res.error || "Could not go live");
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

  async function removePulse(postId: string) {
    if (!myId) return;
    setPulseMenu(null);
    const res = await deletePulse(postId, myId);
    if (!res.ok) setErr(res.error || "Could not delete");
    else {
      setMsg("Pulse removed");
      await refresh(myId);
    }
  }

  function openPulseAuthor(authorId?: string) {
    if (!authorId) return;
    router.push("/u/" + authorId);
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
          <h1 className="h1" style={{ fontSize: 24, marginBottom: 6, position: "relative", zIndex: 1 }}>Hey {first} 👋</h1>
          <p className="muted" style={{ fontSize: 13, position: "relative", zIndex: 1 }}>
            {tier.emoji} <strong style={{ color: "#e9d5ff" }}>{streak}-day streak</strong> · campus network live
          </p>
        </div>

        <div className="section-label">Go somewhere</div>
        <div className="quick-grid">
          <Link href="/discover" className="quick-tile violet"><span className="qt-ico">◎</span><div className="qt-title">Find people</div><div className="qt-sub">Skills · teams</div></Link>
          <Link href="/lounge" className="quick-tile pink"><span className="qt-ico">◈</span><div className="qt-title">Lounge</div><div className="qt-sub">Open chat</div></Link>
          <Link href="/inbox" className="quick-tile cyan"><span className="qt-ico">◇</span><div className="qt-title">Messages</div><div className="qt-sub">DMs</div></Link>
          <Link href="/clubs" className="quick-tile emerald"><span className="qt-ico">✦</span><div className="qt-title">Clubs</div><div className="qt-sub">Events</div></Link>
        </div>

        <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(52,211,153,0.4)", background: "linear-gradient(160deg,rgba(16,185,129,0.14),rgba(6,78,59,0.18))" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>🟢 I'm Free</div>
          <p style={{ fontSize: 12, marginTop: 4, color: "#d1fae5" }}>Place + activity · 15 min · others Ping → chat</p>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
            {PLACES.map((p) => (
              <button key={p} type="button" className={livePlace === p ? "chip on" : "chip"} onClick={() => setLivePlace(p)}>
                {(PLACE_EMOJI[p] || "📍") + " " + p}
              </button>
            ))}
          </div>
          <input value={liveNote} onChange={(e) => setLiveNote(e.target.value)} placeholder="What do you want to do?" maxLength={120} style={{ marginBottom: 8 }} />
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {ACTIVITY_HINTS.map((h) => (
              <button key={h} type="button" className={liveNote === h ? "chip on" : "chip"} style={{ fontSize: 11 }} onClick={() => setLiveNote(h)}>{h}</button>
            ))}
          </div>
          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={goLive}>I'm free at {livePlace}</button>
          {free.map((f: any) => (
            <div key={f.id} style={{ display: "flex", gap: 12, marginBottom: 10, padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.25)" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: f.profile?.avatar_url ? `url(${f.profile.avatar_url}) center/cover` : "var(--grad-cool)", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{displayName(f.profile || {})}</div>
                <p style={{ fontSize: 13 }}><strong style={{ color: "#6ee7b7" }}>{f.place}</strong>{f.note ? ` · “${f.note}”` : ""}</p>
              </div>
              <Link href={"/chat/" + f.user_id} className="btn btn-sm" style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }}>Ping</Link>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(167,139,250,0.4)", background: "linear-gradient(165deg, rgba(139,92,246,0.22), rgba(236,72,153,0.12) 45%, rgba(22,22,32,0.9))" }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>⚡ Campus Pulse</div>
              <p className="muted" style={{ fontSize: 11 }}>··· delete yours · double-tap → profile</p>
            </div>
            <span className="badge">{pulseList.length} live</span>
          </div>
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 16, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <textarea value={pulseText} onChange={(e) => setPulseText(e.target.value)} placeholder="Drop a vibe for campus…" maxLength={200} rows={2} style={{ marginBottom: 8, resize: "none", border: "none", background: "transparent", padding: 0 }} />
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {PULSE_CHIPS.map((c) => (
                <button key={c} type="button" className={pulseText === c ? "chip on" : "chip"} style={{ fontSize: 11 }} onClick={() => setPulseText(c)}>{c}</button>
              ))}
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted" style={{ fontSize: 11 }}>{pulseText.length}/200</span>
              <button className="btn btn-sm" onClick={publishPulse} disabled={!pulseText.trim()}>Drop pulse</button>
            </div>
          </div>

          {pulseList.slice(0, 10).map((p: any, i: number) => (
            <div
              key={p.id}
              onDoubleClick={() => openPulseAuthor(p.author_id)}
              title="Double-tap opens profile"
              style={{
                marginBottom: 10, padding: "12px 14px", borderRadius: 16, background: "rgba(0,0,0,0.28)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderLeft: `3px solid ${["#a855f7", "#ec4899", "#22d3ee", "#fbbf24"][i % 4]}`,
                cursor: "pointer",
              }}
            >
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <p style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 500, flex: 1 }}>{p.content}</p>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  style={{ padding: "2px 10px", fontSize: 16, lineHeight: 1 }}
                  onClick={(e) => { e.stopPropagation(); setPulseMenu(pulseMenu === p.id ? null : p.id); }}
                >···</button>
              </div>
              {pulseMenu === p.id && (
                <div style={{ marginTop: 8, padding: 8, borderRadius: 12, background: "rgba(15,15,22,0.95)", border: "1px solid rgba(255,255,255,0.1)" }} onClick={(e) => e.stopPropagation()}>
                  {p.author_id && (
                    <button type="button" className="btn-ghost btn-sm" style={{ width: "100%", marginBottom: 6, textAlign: "left" }} onClick={() => { setPulseMenu(null); openPulseAuthor(p.author_id); }}>View profile</button>
                  )}
                  {myId && p.author_id === myId ? (
                    <button type="button" className="btn-danger" style={{ width: "100%" }} onClick={() => removePulse(p.id)}>Delete pulse</button>
                  ) : (
                    <p className="muted" style={{ fontSize: 11, padding: 4 }}>Only author can delete</p>
                  )}
                </div>
              )}
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                <span className="muted" style={{ fontSize: 11 }}>{p.is_anonymous !== false ? "Anonymous" : "Student"} · {timeAgo(p.created_at)}</span>
              </div>
            </div>
          ))}
          {!pulseList.length && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 28 }}>⚡</div>
              <p style={{ fontWeight: 700 }}>No pulses yet — drop the first</p>
            </div>
          )}
        </div>

        <Link href="/explore" className="btn-ghost" style={{ display: "block", textAlign: "center" }}>More tools</Link>
      </div>
      <Nav />
    </div>
  );
}
