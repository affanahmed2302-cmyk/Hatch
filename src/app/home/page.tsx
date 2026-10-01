"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, postPulse, fetchPulseFeed, touchPresence } from "@/lib/supabase";
import { fetchFreeNow, setFreeNow, haptic, playPing } from "@/lib/obsession";
import { bumpOpenStreak, streakTier } from "@/lib/engagement";
import { fetchFeedEvents } from "@/lib/clubCore";
import { isMidnightBlackout, blackoutCountdown } from "@/lib/legendary";
import Nav from "@/components/Nav";

const PLACES = ["Library", "Canteen", "Nescafe", "Quad", "Main gate"];

export default function HomePage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pulse, setPulse] = useState<any[]>([]);
  const [free, setFree] = useState<any[]>([]);
  const [clubEvents, setClubEvents] = useState<any[]>([]);
  const [pulseText, setPulseText] = useState("");
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

  async function goFree(place: string) {
    if (!myId) return;
    const res = await setFreeNow(myId, place);
    if (!res.ok) setErr(res.error || "Failed");
    else {
      setMsg("Free at " + place);
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

        <div style={{ marginBottom: 16 }}>
          <h1 className="h1" style={{ fontSize: 22, marginBottom: 4 }}>Hey {first}</h1>
          <p className="muted" style={{ fontSize: 13 }}>
            {tier.emoji} {streak}-day streak · campus network
          </p>
        </div>

        {/* Primary actions — only 3 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <Link href="/discover" className="card" style={{
            textDecoration: "none", color: "inherit", margin: 0,
            background: "linear-gradient(135deg,rgba(139,92,246,0.25),rgba(236,72,153,0.12))",
            border: "1px solid rgba(167,139,250,0.4)",
          }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Find people</div>
            <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Skills · teams · chat</p>
          </Link>
          <Link href="/lounge" className="card" style={{
            textDecoration: "none", color: "inherit", margin: 0,
            background: "linear-gradient(135deg,rgba(88,101,242,0.3),rgba(124,58,237,0.15))",
            border: "1px solid rgba(88,101,242,0.45)",
          }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Lounge</div>
            <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Open campus chat</p>
          </Link>
        </div>

        <Link href="/inbox" className="card" style={{
          display: "block", marginBottom: 12, textDecoration: "none", color: "inherit",
        }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Messages</div>
              <p className="muted" style={{ fontSize: 11 }}>DMs & connections</p>
            </div>
            <span className="muted">→</span>
          </div>
        </Link>

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

        {/* Free now — one simple block */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Free right now</div>
            <span className="badge">{free.length}</span>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: free.length ? 10 : 0 }}>
            {PLACES.map((p) => (
              <button key={p} className="chip" onClick={() => goFree(p)}>{p}</button>
            ))}
          </div>
          {free.slice(0, 4).map((f: any) => (
            <div key={f.id} className="row" style={{ gap: 8, marginTop: 6, alignItems: "center" }}>
              <span style={{ fontSize: 13, flex: 1 }}>
                <strong>{displayName(f.profile || {})}</strong>
                <span className="muted"> · {f.place}</span>
              </span>
              <Link href={"/chat/" + f.user_id} className="btn-ghost btn-sm">Ping</Link>
            </div>
          ))}
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

        {/* Pulse — simple campus board */}
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

        <Link href="/explore" className="btn-ghost" style={{
          display: "block", textAlign: "center", marginBottom: 8,
        }}>
          More tools · Radar, Ghost, Clubs…
        </Link>
      </div>
      <Nav />
    </div>
  );
}
