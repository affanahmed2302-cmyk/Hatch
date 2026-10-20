"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, postPulse, fetchPulseFeed, deletePulse, touchPresence } from "@/lib/supabase";
import { fetchFreeNow, setFreeNow, haptic, playPing } from "@/lib/obsession";
import { bumpOpenStreak, streakTier } from "@/lib/engagement";
import { fetchFeedEvents } from "@/lib/clubCore";
import { ensureNotifyPermission } from "@/lib/notify";
import Nav from "@/components/Nav";
import { shareInvite } from "@/lib/invite";
import { replyToPulse, fetchPulseReplies } from "@/lib/pulse";
import AppSkeleton from "@/components/AppSkeleton";
import HomeModeGrids from "@/components/HomeModeGrids";
import { isConfessionOpenNow } from "@/lib/features";

const PLACES = ["Library", "Main Canteen", "Cafeteria", "Architecture Park", "Ground", "Sports Complex", "Basement", "Back Benches"];
const PLACE_EMOJI: Record<string, string> = {
  Library: "📚", "Main Canteen": "🍽️", Cafeteria: "☕", "Architecture Park": "🌳",
  Ground: "🏟️", "Sports Complex": "🏃", Basement: "🏢", "Back Benches": "🪑",
};
const ACTIVITY_HINTS = ["Study buddy · Library", "Food run · canteen", "Coffee + chill", "Walk around campus", "Sports / badminton", "Just free to talk", "Project help", "Quiet hang · benches"];
const PULSE_CHIPS = ["🔥 Something wild just happened…", "📚 Library energy right now", "🍽️ Main canteen — anyone?", "🏀 Ground / sports?", "🌙 Night campus hits different", "😂 Random BMSCE thought"];

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
  const [livePlace, setLivePlace] = useState("Library");
  const [streak, setStreak] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsPhoto, setNeedsPhoto] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [mode, setMode] = useState<"professional" | "social" | "both">("both");
  const [confessionOpen, setConfessionOpen] = useState(false);
  const router = useRouter();

  async function refresh(_uid: string) {
    const [f, p, ce] = await Promise.all([fetchFreeNow(), fetchPulseFeed(), fetchFeedEvents(5)]);
    setFree(f);
    setPulse(Array.isArray(p) ? p : ((p as any)?.data || []));
    setClubEvents(ce);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      touchPresence(user.id);
      const { data: prof } = await supabase.from("profiles").select("full_name, username, avatar_url, profile_mode").eq("id", user.id).maybeSingle();
      setName(prof?.full_name || prof?.username || "there");
      setNeedsPhoto(!prof?.avatar_url);
      let m: "professional" | "social" | "both" = "both";
      try {
        const local = localStorage.getItem("hatch_profile_mode");
        if (local === "professional" || local === "social" || local === "both") m = local;
      } catch {}
      if (prof?.profile_mode === "professional" || prof?.profile_mode === "social" || prof?.profile_mode === "both") m = prof.profile_mode;
      setMode(m);
      try { setConfessionOpen(await isConfessionOpenNow()); } catch {}
      setLoading(false);
      ensureNotifyPermission();
      bumpOpenStreak(user.id).then(setStreak).catch(() => {});
      void refresh(user.id);
    })();
  }, [router]);

  useEffect(() => {
    if (!myId) return;
    const id = window.setInterval(() => { void refresh(myId); }, 45000);
    return () => clearInterval(id);
  }, [myId]);

  async function goLive() {
    if (!myId) return;
    const res = await setFreeNow(myId, livePlace, liveNote.trim() || undefined);
    if (!res.ok) setErr(res.error || "Could not go live");
    else {
      setMsg("You're visible for ~90 min · friends can Ping you");
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
    const res = await deletePulse(postId, myId);
    if (!res.ok) setErr(res.error || "Could not delete");
    else {
      setMsg("Pulse removed");
      await refresh(myId);
    }
  }

  async function doInvite() {
    const r = await shareInvite();
    if (r.ok && r.method === "clipboard") setInviteMsg("Invite link copied — send to classmates");
    else if (r.ok) setInviteMsg("Share sheet opened");
    else setInviteMsg("Copy: hatch-primeora.vercel.app/signup");
  }

  async function openReplies(postId: string) {
    if (replyOpen === postId) { setReplyOpen(null); return; }
    setReplyOpen(postId);
    setReplyText("");
    const list = await fetchPulseReplies(postId);
    setReplies((prev) => ({ ...prev, [postId]: list }));
  }

  async function sendReply(postId: string, authorId?: string) {
    if (!myId || !replyText.trim()) return;
    const res = await replyToPulse(postId, myId, replyText, authorId);
    if (!res.ok) { setErr(res.error || "Reply failed"); return; }
    setReplyText("");
    setMsg("Reply sent");
    const list = await fetchPulseReplies(postId);
    setReplies((prev) => ({ ...prev, [postId]: list }));
    haptic(8);
  }

  if (loading) return <AppSkeleton />;

  const tier = streakTier(streak);
  const pulseList = Array.isArray(pulse) ? pulse : [];
  const first = (name || "there").split(" ")[0];
  const showSocial = mode === "social" || mode === "both";

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
          <h1 className="h1" style={{ fontSize: 24, marginBottom: 6 }}>Hey {first} 👋</h1>
          <p className="muted" style={{ fontSize: 13 }}>
            {tier.emoji} <strong style={{ color: "#e9d5ff" }}>{streak}-day streak</strong> · campus network
          </p>
        </div>

        {needsPhoto && (
          <Link href="/profile" className="card" style={{
            display: "block", marginBottom: 12, textDecoration: "none", color: "inherit",
            border: "1px solid rgba(251,191,36,0.35)",
            background: "linear-gradient(160deg, rgba(251,191,36,0.12), rgba(22,22,32,0.85))",
          }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Finish your profile</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Add a photo · 30 seconds</p>
          </Link>
        )}

        <HomeModeGrids mode={mode} confessionOpen={confessionOpen} onInvite={doInvite} inviteMsg={inviteMsg} />

        {showSocial && (
          <>
            <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(52,211,153,0.4)", background: "linear-gradient(160deg,rgba(16,185,129,0.14),rgba(6,78,59,0.18))" }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>🟢 I'm Free</div>
              <p style={{ fontSize: 12, marginTop: 4, color: "#d1fae5" }}>Place + activity · friends can Ping you</p>
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
                <div key={f.id || f.user_id} style={{ display: "flex", gap: 12, marginBottom: 10, padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.25)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: (f.profile || f.profiles)?.avatar_url ? `url(${(f.profile || f.profiles).avatar_url}) center/cover` : "var(--grad-cool)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{displayName(f.profile || f.profiles || {})}</div>
                    <p style={{ fontSize: 13 }}><strong style={{ color: "#6ee7b7" }}>{f.place}</strong>{f.note ? ` · “${f.note}”` : ""}</p>
                  </div>
                  <Link href={"/chat/" + f.user_id} className="btn btn-sm" style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }}>Ping</Link>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(167,139,250,0.4)" }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>⚡ Campus Pulse</div>
                  <p className="muted" style={{ fontSize: 11 }}>Campus vibe feed</p>
                </div>
                <span className="badge">{pulseList.length} live</span>
              </div>
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 16, background: "rgba(0,0,0,0.3)" }}>
                <textarea value={pulseText} onChange={(e) => setPulseText(e.target.value)} placeholder="Drop a vibe…" maxLength={200} rows={2} style={{ marginBottom: 8, resize: "none" }} />
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
              {pulseList.slice(0, 8).map((p: any, i: number) => (
                <div key={p.id} style={{
                  marginBottom: 10, padding: "12px 14px", borderRadius: 16, background: "rgba(0,0,0,0.28)",
                  borderLeft: `3px solid ${["#a855f7", "#ec4899", "#22d3ee", "#fbbf24"][i % 4]}`,
                }}>
                  <p style={{ fontSize: 14, lineHeight: 1.45 }}>{p.content}</p>
                  <div className="row" style={{ marginTop: 8, gap: 10 }}>
                    <span className="muted" style={{ fontSize: 11 }}>{timeAgo(p.created_at)}</span>
                    {myId && (p.author_id === myId || p.user_id === myId) && (
                      <button type="button" className="btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => removePulse(p.id)}>Delete</button>
                    )}
                    <button type="button" className="btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => openReplies(p.id)}>
                      {replyOpen === p.id ? "Hide" : "Reply"}
                    </button>
                  </div>
                  {replyOpen === p.id && (
                    <div style={{ marginTop: 10 }}>
                      {(replies[p.id] || []).map((r: any) => (
                        <div key={r.id} style={{ padding: "8px 10px", marginBottom: 6, borderRadius: 10, background: "rgba(255,255,255,0.04)", fontSize: 13 }}>
                          <strong style={{ fontSize: 11 }}>{displayName(r.profile || {})}</strong>
                          <p style={{ marginTop: 2 }}>{r.content}</p>
                        </div>
                      ))}
                      <div className="row" style={{ gap: 8, marginTop: 6 }}>
                        <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply…" maxLength={200} style={{ flex: 1 }} />
                        <button className="btn btn-sm" onClick={() => sendReply(p.id, p.author_id || p.user_id)}>Send</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {clubEvents.length > 0 && (mode === "professional" || mode === "both") && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Club events</div>
            {clubEvents.map((e: any) => (
              <div key={e.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{e.title || e.club_name || "Event"}</div>
                <p className="muted" style={{ fontSize: 12 }}>{e.description || e.when_label || ""}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 80 }} />
      </div>
      <Nav />
    </div>
  );
}
