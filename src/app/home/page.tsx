"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, needsTermsAcceptance, postPulse, fetchPulseFeed, displayName } from "@/lib/supabase";
import { broadcastIntent, fetchActiveIntents, clearMyIntent, type LiveIntent } from "@/lib/intents";
import Nav from "@/components/Nav";

const LOCATIONS = ["Campus", "Canteen", "Library", "Lab", "Hostel", "Quad", "Turf"];

export default function HomePage() {
  const [intents, setIntents] = useState<LiveIntent[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [intentMsg, setIntentMsg] = useState("");
  const [loc, setLoc] = useState("Campus");
  const [pulseText, setPulseText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"radar" | "pulse">("radar");
  const router = useRouter();

  async function refresh(uid: string) {
    if (await needsTermsAcceptance(uid)) {
      router.replace("/terms");
      return;
    }
    const [i, p] = await Promise.all([fetchActiveIntents(), fetchPulseFeed()]);
    setIntents(i.data || []);
    setPosts(p.data || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      await refresh(user.id);
    })();
  }, [router]);

  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel("live-intents")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_intents" }, () => {
        fetchActiveIntents().then((r) => setIntents(r.data || []));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId]);

  async function goLive() {
    if (!myId || !intentMsg.trim()) return;
    setErr(""); setMsg("");
    const res = await broadcastIntent(myId, intentMsg, loc);
    if (!res.ok) { setErr(res.error || "Failed"); return; }
    setIntentMsg("");
    setMsg("You're live for 2 hours");
    await refresh(myId);
  }

  async function stopLive() {
    if (!myId) return;
    await clearMyIntent(myId);
    setMsg("Broadcast ended");
    await refresh(myId);
  }

  async function publishPulse() {
    if (!myId || !pulseText.trim()) return;
    setErr(""); setMsg("");
    const res = await postPulse(myId, pulseText, "campus", true);
    if (!res.ok) { setErr(res.error || "Failed"); return; }
    setPulseText("");
    setMsg("Posted anonymously");
    await refresh(myId);
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 4 }}>Campus live</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>What people are doing right now</p>
        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}

        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button className={`chip ${tab === "radar" ? "on" : ""}`} onClick={() => setTab("radar")}>Quad Radar</button>
          <button className={`chip ${tab === "pulse" ? "on" : ""}`} onClick={() => setTab("pulse")}>Pulse</button>
        </div>

        {tab === "radar" && (
          <>
            <div className="card stack" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Broadcast intent (2h)</div>
              <input
                placeholder="e.g. Heading to canteen · need 1 more for lab"
                value={intentMsg}
                maxLength={100}
                onChange={(e) => setIntentMsg(e.target.value)}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LOCATIONS.map((l) => (
                  <button key={l} type="button" className={`chip ${loc === l ? "on" : ""}`} onClick={() => setLoc(l)}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-sm" onClick={goLive} disabled={!intentMsg.trim()}>Go live</button>
                <button className="btn-ghost btn-sm" onClick={stopLive}>End</button>
              </div>
            </div>
            {intents.map((it) => (
              <div key={it.id} className="card" style={{ marginBottom: 10 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <div className="h2">{displayName(it.profile || {})}</div>
                  <span className="badge">{it.location_tag}</span>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.45 }}>{it.message}</p>
                <div className="row" style={{ marginTop: 10, gap: 8 }}>
                  {it.user_id !== myId && (
                    <Link href={`/chat/${it.user_id}`} className="btn btn-sm">Join / Ping</Link>
                  )}
                  <span className="muted" style={{ fontSize: 11 }}>
                    until {new Date(it.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
            {intents.length === 0 && <div className="empty"><p>No one live right now — be first</p></div>}
          </>
        )}

        {tab === "pulse" && (
          <>
            <div className="card stack" style={{ marginBottom: 14 }}>
              <textarea
                placeholder="Anonymous campus note (6h)"
                value={pulseText}
                onChange={(e) => setPulseText(e.target.value)}
                rows={2}
                maxLength={280}
              />
              <button className="btn btn-sm" onClick={publishPulse} disabled={!pulseText.trim()}>Post pulse</button>
            </div>
            {posts.map((p) => (
              <div key={p.id} className="card" style={{ marginBottom: 10 }}>
                <span className="badge">{p.is_anonymous ? "Anonymous" : "Named"}</span>
                <p style={{ fontSize: 15, marginTop: 8, lineHeight: 1.45 }}>{p.content}</p>
              </div>
            ))}
            {posts.length === 0 && <div className="empty"><p>No pulse yet</p></div>}
          </>
        )}
      </div>
      <Nav />
    </div>
  );
}
