"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, postPulse, fetchPulseFeed, touchPresence } from "@/lib/supabase";
import {
  fetchBubbles, postBubble, fetchFreeNow, setFreeNow, fetchDailyRecap,
  haptic, playPing,
} from "@/lib/obsession";
import {
  VIBE_OPTIONS, voteVibe, fetchVibeCounts, setStudyBeacon, fetchStudyBeacons,
  postBounty, fetchBounties, bumpOpenStreak, streakTier, DEFAULT_EVENTS, eventCountdown,
} from "@/lib/engagement";
import { fetchFeedEvents } from "@/lib/clubCore";
import { EcosystemPortalGrid } from "@/components/EcosystemGateway";
import Nav from "@/components/Nav";

const PLACES = ["Library", "Canteen", "Nescafe", "Quad", "Main gate"];
const STUDY_SPOTS = ["Library", "Dept lab", "Hostel desk", "Quad", "Canteen table"];

export default function HomePage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [pulse, setPulse] = useState<any[]>([]);
  const [bubbles, setBubbles] = useState<any[]>([]);
  const [free, setFree] = useState<any[]>([]);
  const [recap, setRecap] = useState<any>(null);
  const [showRecap, setShowRecap] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [pulseText, setPulseText] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [vibeCounts, setVibeCounts] = useState<Record<string, number>>({});
  const [beacons, setBeacons] = useState<any[]>([]);
  const [bounties, setBounties] = useState<any[]>([]);
  const [bountyTitle, setBountyTitle] = useState("");
  const [streak, setStreak] = useState(0);
  const [repFlash, setRepFlash] = useState(false);
  const [myRep, setMyRep] = useState(0);
  const [clubEvents, setClubEvents] = useState<any[]>([]);
  const [tick, setTick] = useState(0);
  const router = useRouter();

  async function refresh(uid: string) {
    const [b, f, p, r, vc, sb, mb, ce] = await Promise.all([
      fetchBubbles(), fetchFreeNow(), fetchPulseFeed(), fetchDailyRecap(uid),
      fetchVibeCounts(), fetchStudyBeacons(), fetchBounties(), fetchFeedEvents(8),
    ]);
    setBubbles(b);
    setFree(f);
    setPulse(p.ok ? p.data : []);
    setRecap(r);
    setVibeCounts(vc);
    setBeacons(sb);
    setBounties(mb);
    setClubEvents(ce);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      touchPresence(user.id);
      const s = await bumpOpenStreak(user.id);
      setStreak(s);
      const { data: prof } = await supabase.from("profiles").select("rep_score").eq("id", user.id).maybeSingle();
      setMyRep(prof?.rep_score || 0);
      await refresh(user.id);
      const key = "hatch_recap_" + new Date().toLocaleDateString("en-CA");
      if (!sessionStorage.getItem(key)) {
        setShowRecap(true);
        sessionStorage.setItem(key, "1");
      }
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  async function publishBubble() {
    if (!myId || !bubbleText.trim()) return;
    try {
      const res = await postBubble(myId, bubbleText);
      if (!res.ok) setErr(res.error || "Failed");
      else { setBubbleText(""); setMsg("Bubble live 24h"); haptic(10); await refresh(myId); }
    } catch (e: any) { setErr(e?.message || "Failed"); }
  }

  async function goFree(place: string) {
    if (!myId) return;
    try {
      const res = await setFreeNow(myId, place);
      if (!res.ok) setErr(res.error || "Failed");
      else { setMsg("Free at " + place + " · 15 min"); haptic([10, 20, 10]); playPing(); await refresh(myId); }
    } catch (e: any) { setErr(e?.message || "Failed"); }
  }

  async function publishPulse() {
    if (!myId || !pulseText.trim()) return;
    try {
      const res = await postPulse(myId, pulseText);
      if (!res.ok) setErr(res.error || "Failed");
      else { setPulseText(""); setMsg("Posted"); haptic(8); await refresh(myId); }
    } catch (e: any) { setErr(e?.message || "Failed"); }
  }

  async function onVibe(choice: string) {
    if (!myId) return;
    const res = await voteVibe(myId, choice);
    if (!res.ok) setErr(res.error || "Vote failed — run hatch_growth.sql");
    else { setMsg("Vibe logged"); haptic(8); setVibeCounts(await fetchVibeCounts()); }
  }

  async function onBeacon(place: string) {
    if (!myId) return;
    const res = await setStudyBeacon(myId, place);
    if (!res.ok) setErr(res.error || "Beacon failed — run hatch_growth.sql");
    else { setMsg("Beacon on · 1 hour"); haptic(10); setBeacons(await fetchStudyBeacons()); }
  }

  async function onBounty() {
    if (!myId || !bountyTitle.trim()) return;
    const res = await postBounty(myId, bountyTitle, 50);
    if (!res.ok) setErr(res.error || "Failed — run hatch_growth.sql");
    else { setBountyTitle(""); setMsg("Bounty live 24h"); setBounties(await fetchBounties()); }
  }

  function flashRep() {
    setRepFlash(true);
    setTimeout(() => setRepFlash(false), 1200);
  }

  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading...</span></div>;

  const pulseList = Array.isArray(pulse) ? pulse : [];
  const tickerText = pulseList.slice(0, 8).map((p: any) => p.content).join("  ·  ") || "Be the first pulse of the day…";
  const tier = streakTier(streak);
  void tick;

  return (
    <div className="shell">
      {showRecap && recap && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12,
        }} onClick={() => setShowRecap(false)}>
          <div className="card" style={{ width: "min(420px,100%)", borderRadius: 20 }} onClick={e => e.stopPropagation()}>
            <div className="h2" style={{ marginBottom: 8 }}>Today on Hatch</div>
            <p style={{ fontSize: 14, marginBottom: 6 }}>Connects: {recap.connects}</p>
            <p style={{ fontSize: 14, marginBottom: 6 }}>Messages: {recap.messages}</p>
            <p style={{ fontSize: 14, marginBottom: 10 }}>Profile views: {recap.views_received}</p>
            <button className="btn" onClick={() => setShowRecap(false)}>Got it</button>
          </div>
        </div>
      )}

      <div className="topbar">
        <div className="logo">HATCH</div>
        <button type="button" className="btn-ghost btn-sm" onClick={flashRep} style={{ marginLeft: "auto" }}>
          {repFlash ? `+rep ⚡` : `${myRep} rep`}
        </button>
        <Link href="/leaderboard" className="btn-ghost btn-sm">Ranks</Link>
      </div>

      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card row" style={{ marginBottom: 10, gap: 10, alignItems: "center",
          background: streak >= 3 ? "linear-gradient(135deg,rgba(251,146,60,0.2),rgba(239,68,68,0.1))" : undefined }}>
          <span style={{ fontSize: 22 }}>{tier.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{streak}-day open streak</div>
            <p className="muted" style={{ fontSize: 11 }}>{tier.label} · open Hatch daily</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 10, padding: "10px 12px", overflow: "hidden" }}>
          <div className="muted" style={{ fontSize: 10, marginBottom: 4, fontWeight: 700 }}>TEA TICKER</div>
          <div style={{ whiteSpace: "nowrap", overflow: "hidden" }}>
            <span style={{
              display: "inline-block", fontSize: 12,
              animation: "hatch-marquee 28s linear infinite",
            }}>{tickerText} · {tickerText}</span>
          </div>
        </div>

        {clubEvents.length > 0 && (
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="h2" style={{ marginBottom: 8, fontSize: 14 }}>Club events</div>
            {clubEvents.map((ev) => (
              <div key={ev.id} style={{ marginBottom: 8, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{ev.title}</div>
                {ev.body && <p className="muted" style={{ fontSize: 12 }}>{ev.body}</p>}
                {ev.venue && <p className="muted" style={{ fontSize: 11 }}>{ev.venue}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="card row" style={{ marginBottom: 10, gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Free now</div>
            <p className="muted" style={{ fontSize: 11 }}>{free.length} student{free.length === 1 ? "" : "s"} · 15 min windows</p>
          </div>
          <span className="badge">{free.length}</span>
        </div>

        <div className="card" style={{ marginBottom: 10 }}>
          <div className="h2" style={{ marginBottom: 8, fontSize: 14 }}>Flash vibe · today</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {VIBE_OPTIONS.map((v) => (
              <button key={v.id} className="btn-ghost btn-sm" onClick={() => onVibe(v.id)}>
                {v.label}{vibeCounts[v.id] ? ` · ${vibeCounts[v.id]}` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 10 }}>
          <div className="h2" style={{ marginBottom: 8, fontSize: 14 }}>Study beacon · 1h</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {STUDY_SPOTS.map((p) => (
              <button key={p} className="btn-ghost btn-sm" onClick={() => onBeacon(p)}>{p}</button>
            ))}
          </div>
          {beacons.slice(0, 5).map((b: any) => (
            <p key={b.id} style={{ fontSize: 12, marginBottom: 4 }}>
              <strong>{displayName(b.profile || {})}</strong>
              <span className="muted"> · {b.place}</span>
            </p>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 10 }}>
          <div className="h2" style={{ marginBottom: 8, fontSize: 14 }}>Campus countdowns</div>
          {DEFAULT_EVENTS.map((ev) => (
            <div key={ev.id} className="row" style={{ marginBottom: 6, alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: 13 }}>{ev.name}</span>
              <span className="badge">{eventCountdown(ev.at)}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 10 }}>
          <div className="h2" style={{ marginBottom: 8, fontSize: 14 }}>Ecosystem</div>
          <EcosystemPortalGrid compact />
        </div>

        <div className="card" style={{ marginBottom: 10 }}>
          <div className="h2" style={{ marginBottom: 8, fontSize: 14 }}>Micro-bounties</div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <input value={bountyTitle} onChange={(e) => setBountyTitle(e.target.value)} placeholder="Need lab slot swap…" maxLength={120} style={{ flex: 1 }} />
            <button className="btn btn-sm" onClick={onBounty}>Post</button>
          </div>
          {bounties.slice(0, 5).map((b: any) => (
            <p key={b.id} style={{ fontSize: 12, marginBottom: 4 }}>
              {b.title}{b.reward_inr ? ` · ₹${b.reward_inr}` : ""}
            </p>
          ))}
          {!bounties.length && <p className="muted" style={{ fontSize: 11 }}>No open bounties</p>}
        </div>

        <Link href="/discover" className="card" style={{
          display: "block", marginBottom: 10, textDecoration: "none", color: "inherit",
          border: "1px solid rgba(167,139,250,0.4)",
        }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>AI icebreakers on Match</div>
          <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>Open Discover → empty chats get 1-tap starters</p>
        </Link>

        <Link
          href="/lounge"
          className="card"
          style={{
            display: "block", marginBottom: 14, textDecoration: "none", color: "inherit",
            background: "linear-gradient(135deg,rgba(88,101,242,0.35),rgba(124,58,237,0.2))",
            border: "1px solid rgba(88,101,242,0.5)",
            boxShadow: "0 8px 28px rgba(88,101,242,0.25)",
          }}
        >
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "linear-gradient(135deg,#5865F2,#8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 22, color: "#fff",
            }}>#</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Campus Lounge</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>Discord-style open chat · tap to talk</p>
            </div>
            <span className="badge" style={{ background: "#5865F2", color: "#fff" }}>CHAT</span>
          </div>
        </Link>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Campus bubbles · 24h</div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <input value={bubbleText} onChange={e => setBubbleText(e.target.value)} placeholder="What's the vibe?" maxLength={80} style={{ flex: 1 }} />
            <button className="btn btn-sm" onClick={publishBubble}>Post</button>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {bubbles.map((b: any) => (
              <div key={b.id} style={{ minWidth: 100, textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", margin: "0 auto 6px",
                  border: "2px solid #a78bfa",
                  background: b.profile?.avatar_url ? `url(${b.profile.avatar_url}) center/cover` : "var(--grad-cool)",
                }} />
                <p style={{ fontSize: 11, fontWeight: 600 }}>{displayName(b.profile || {})}</p>
                <p className="muted" style={{ fontSize: 10 }}>{b.text.slice(0, 28)}</p>
              </div>
            ))}
            {bubbles.length === 0 && <p className="muted" style={{ fontSize: 12 }}>No bubbles yet</p>}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Free now · 15 min</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {PLACES.map(p => (
              <button key={p} className="btn-ghost btn-sm" onClick={() => goFree(p)}>{p}</button>
            ))}
          </div>
          {free.map((f: any) => (
            <div key={f.id} className="row" style={{ gap: 10, marginBottom: 6, alignItems: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: f.profile?.avatar_url ? `url(${f.profile.avatar_url}) center/cover` : "var(--grad-cool)",
              }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{displayName(f.profile || {})}</span>
                <span className="muted" style={{ fontSize: 12 }}> · {f.place}</span>
              </div>
              <Link href={"/chat/" + f.user_id} className="btn-ghost btn-sm">Ping</Link>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Pulse</div>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <input value={pulseText} onChange={e => setPulseText(e.target.value)} placeholder="Anonymous campus note…" maxLength={280} style={{ flex: 1 }} />
            <button className="btn btn-sm" onClick={publishPulse}>Post</button>
          </div>
          {pulseList.map((p: any) => (
            <div key={p.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 14 }}>{p.content}</p>
              <p className="muted" style={{ fontSize: 11 }}>{p.category || "general"}</p>
            </div>
          ))}
          {pulseList.length === 0 && <p className="muted" style={{ fontSize: 12 }}>No pulse yet</p>}
        </div>

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link href="/discover" className="btn btn-sm">Find people</Link>
          <Link href="/lounge" className="btn-ghost btn-sm">Lounge chat</Link>
          <Link href="/teams" className="btn-ghost btn-sm">Teams</Link>
          <Link href="/clubs" className="btn-ghost btn-sm">Clubs</Link>
        </div>
      </div>
      <Nav />
      <style>{`@keyframes hatch-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
