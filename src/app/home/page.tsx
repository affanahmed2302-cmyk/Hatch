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

const QUERY_HINTS = [
  "Need 1 lab partner · DSP",
  "Sharing notes · CIE 2",
  "Anyone for filter coffee?",
  "Looking for hackathon teammate",
  "Quiet study · library 2nd floor",
];

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

  async function goLive() {
    if (!myId) return;
    const note = liveNote.trim();
    const res = await setFreeNow(myId, livePlace, note || undefined);
    if (!res.ok) setErr(res.error || "Failed — run hatch_avatars_and_free_now.sql");
    else {
      setMsg(
        note
          ? `Live at ${livePlace}: “${note}” · others can Ping you`
          : `Live at ${livePlace} · others can Ping you`
      );
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
      setMsg("Posted");
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

        {/* CAMPUS LIVE — place + unique query + ping */}
        <div className="card" style={{
          marginBottom: 12,
          border: "1px solid rgba(52,211,153,0.35)",
          background: "linear-gradient(160deg,rgba(16,185,129,0.12),rgba(6,78,59,0.15))",
        }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🟢 Campus Live</div>
              <p className="muted" style={{ fontSize: 11 }}>
                Place + your unique ask · live 15 min · others Ping → chat
              </p>
            </div>
            <span className="badge" style={{ background: "#10b981", color: "#fff" }}>{free.length} live</span>
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

          <p className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Your unique query (optional)</p>
          <input
            value={liveNote}
            onChange={(e) => setLiveNote(e.target.value)}
            placeholder="e.g. Need lab partner · DSP notes"
            maxLength={120}
            style={{ marginBottom: 8 }}
          />
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {QUERY_HINTS.map((h) => (
              <button
                key={h}
                type="button"
                className="btn-ghost btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => setLiveNote(h)}
              >
                {h}
              </button>
            ))}
          </div>

          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={goLive}>
            Go live at {livePlace}
          </button>

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
              Nobody live yet — go live with your query so others can Ping you
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

        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Campus pulse</div>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <input
              value={pulseText}
              onChange={(e) => setPulseText(e.target.value)}
              placeholder="Share something…"
              maxLength={200}
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm" onClick={publishPulse}>Post</button>
          </div>
          {pulseList.slice(0, 8).map((p: any) => (
            <div key={p.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 14 }}>{p.content}</p>
            </div>
          ))}
          {!pulseList.length && <p className="muted" style={{ fontSize: 12 }}>Nothing yet — post first</p>}
        </div>

        <Link href="/explore" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }}>
          More tools · Radar, Ghost, Clubs…
        </Link>
      </div>
      <Nav />
    </div>
  );
}
