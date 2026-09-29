"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, postPulse, fetchPulseFeed, touchPresence } from "@/lib/supabase";
import {
  fetchBubbles, postBubble, fetchFreeNow, setFreeNow, fetchDailyRecap,
  haptic, playPing,
} from "@/lib/obsession";
import { fetchActiveIntents } from "@/lib/intents";
import Nav from "@/components/Nav";

const PLACES = ["Library", "Canteen", "Nescafe", "Quad", "Main gate"];

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
  const router = useRouter();

  async function refresh(uid: string) {
    const [b, f, p, r] = await Promise.all([
      fetchBubbles(), fetchFreeNow(), fetchPulseFeed(), fetchDailyRecap(uid),
    ]);
    setBubbles(b);
    setFree(f);
    setPulse(p.ok ? p.data : []);
    setRecap(r);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      touchPresence(user.id);
      await refresh(user.id);
      const key = "hatch_recap_" + new Date().toLocaleDateString("en-CA");
      if (!sessionStorage.getItem(key)) {
        setShowRecap(true);
        sessionStorage.setItem(key, "1");
      }
      setLoading(false);
    })();
  }, [router]);

  async function publishBubble() {
    if (!myId || !bubbleText.trim()) return;
    const res = await postBubble(myId, bubbleText);
    if (!res.ok) setErr(res.error || "Failed");
    else { setBubbleText(""); setMsg("Bubble live 24h"); haptic(10); await refresh(myId); }
  }

  async function goFree(place: string) {
    if (!myId) return;
    const res = await setFreeNow(myId, place);
    if (!res.ok) setErr(res.error || "Failed");
    else { setMsg("Free at " + place + " · 15 min"); haptic([10, 20, 10]); playPing(); await refresh(myId); }
  }

  async function publishPulse() {
    if (!myId || !pulseText.trim()) return;
    const res = await postPulse(myId, pulseText);
    if (!res.ok) setErr(res.error || "Failed");
    else { setPulseText(""); setMsg("Posted"); haptic(8); await refresh(myId); }
  }

  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading...</span></div>;

  const pulseList = Array.isArray(pulse) ? pulse : [];

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
        <Link href="/leaderboard" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>Ranks</Link>
      </div>

      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

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
          <Link href="/teams" className="btn-ghost btn-sm">Teams</Link>
          <Link href="/clubs" className="btn-ghost btn-sm">Clubs</Link>
          <Link href="/saved" className="btn-ghost btn-sm">Saved</Link>
        </div>
      </div>
      <Nav />
    </div>
  );
}
