"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, needsTermsAcceptance, postPulse, fetchPulseFeed, displayName, handleOf } from "@/lib/supabase";
import { broadcastIntent, fetchActiveIntents, clearMyIntent, type LiveIntent } from "@/lib/intents";
import { ZONES, getTodayVibe, setTodayVibe } from "@/lib/vibe";
import Nav from "@/components/Nav";

const LOCATIONS = ["Campus", "Canteen", "Library", "Lab", "Hostel", "Quad", "Turf"];

type FeedItem =
  | { kind: "intent"; id: string; at: number; data: LiveIntent }
  | { kind: "pulse"; id: string; at: number; data: any };

export default function HomePage() {
  const [intents, setIntents] = useState<LiveIntent[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [composer, setComposer] = useState("");
  const [mode, setMode] = useState<"live" | "pulse">("live");
  const [loc, setLoc] = useState("Campus");
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState("there");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [vibe, setVibe] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [setupHint, setSetupHint] = useState(false);
  const router = useRouter();

  async function refresh(uid: string) {
    if (await needsTermsAcceptance(uid)) {
      router.replace("/terms");
      return;
    }
    const [i, p] = await Promise.all([fetchActiveIntents(), fetchPulseFeed()]);
    setIntents(i.data || []);
    setPosts(p.data || []);
    const missing =
      (i.error && (i.error.includes("live_intents") || i.error.includes("schema cache") || i.error.includes("table missing"))) ||
      (p.error && (p.error.includes("pulse") || p.error.includes("schema cache")));
    setSetupHint(!!missing);
    if (missing) setErr("");
    else if (i.error) setErr(i.error);
    else setErr("");
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      const { data: prof } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
      if (prof?.full_name) setMyName(prof.full_name.split(" ")[0]);
      else if (prof?.username) setMyName(prof.username);
      const v = await getTodayVibe(user.id);
      if (v.data?.zone) setVibe(v.data.zone);
      await refresh(user.id);
    })();
  }, [router]);

  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel("live-intents-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_intents" }, () => {
        fetchActiveIntents().then((r) => setIntents(r.data || []));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId]);

  async function pickVibe(zone: string) {
    if (!myId) return;
    const res = await setTodayVibe(myId, zone);
    if (res.ok) {
      setVibe(zone);
      setMsg("Vibe set - " + zone);
      setTimeout(() => setMsg(""), 2000);
    } else if (res.error && (res.error.includes("schema") || res.error.includes("vibe_checks"))) {
      setSetupHint(true);
    } else setErr(res.error || "Could not save vibe");
  }

  async function publish() {
    if (!myId || !composer.trim() || posting) return;
    setPosting(true);
    setErr(""); setMsg("");
    if (mode === "live") {
      const res = await broadcastIntent(myId, composer, loc);
      if (!res.ok) {
        if (res.error && (res.error.includes("table") || res.error.includes("schema") || res.error.includes("SQL"))) setSetupHint(true);
        else setErr(res.error || "Failed");
        setPosting(false);
        return;
      }
      setMsg("You are live for 2 hours - people can ping you");
    } else {
      const res = await postPulse(myId, composer);
      if (!res.ok) {
        if (res.error && (res.error.includes("table") || res.error.includes("schema"))) setSetupHint(true);
        else setErr(res.error || "Failed");
        setPosting(false);
        return;
      }
      setMsg("Pulse posted - vanishes in 6h");
    }
    setComposer("");
    await refresh(myId);
    setPosting(false);
    setTimeout(() => setMsg(""), 3000);
  }

  async function stopLive() {
    if (!myId) return;
    await clearMyIntent(myId);
    setMsg("Broadcast ended");
    await refresh(myId);
  }

  const feed: FeedItem[] = [
    ...intents.map((it) => ({
      kind: "intent" as const,
      id: it.id,
      at: new Date(it.created_at).getTime(),
      data: it,
    })),
    ...posts.map((p) => ({
      kind: "pulse" as const,
      id: p.id,
      at: new Date(p.created_at).getTime(),
      data: p,
    })),
  ].sort((a, b) => b.at - a.at);

  const liveCount = intents.length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Hey" : "Good evening";

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading campus...</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">HATCH</div>
        {liveCount > 0 && (
          <span className="badge" style={{ marginLeft: "auto" }}>
            {liveCount} live now
          </span>
        )}
      </div>

      <div className="page">
        <div style={{ marginBottom: 18 }}>
          <p className="muted" style={{ fontSize: 13, marginBottom: 4 }}>{greet}, {myName}</p>
          <h1 className="h1" style={{ fontSize: 26, lineHeight: 1.2 }}>
            Who&apos;s around{" "}
            <span style={{
              background: "var(--grad-primary)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>right now?</span>
          </h1>
        </div>

        {msg && <div className="ok" style={{ marginBottom: 12 }}>{msg}</div>}
        {err && !setupHint && <div className="fail" style={{ marginBottom: 12 }}>{err}</div>}

        {setupHint && (
          <div className="card" style={{ marginBottom: 14, borderColor: "rgba(251,191,36,0.35)" }}>
            <div className="h2" style={{ marginBottom: 6 }}>One-time setup</div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
              Database tables are not created yet. Open Supabase SQL Editor, paste the fix script, Run, then refresh.
            </p>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <span className="label" style={{ margin: 0 }}>Your zone today</span>
            {vibe && <span className="badge">{vibe}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
            {ZONES.map((z) => (
              <button
                key={z}
                className={`chip ${vibe === z ? "on" : ""}`}
                style={{ flexShrink: 0 }}
                onClick={() => pickVibe(z)}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        {intents.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 8 }}>Live on campus</div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
              {intents.slice(0, 12).map((it) => (
                <Link
                  key={it.id}
                  href={it.user_id === myId ? "#" : `/chat/${it.user_id}`}
                  style={{ flexShrink: 0, width: 72, textAlign: "center" }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%", margin: "0 auto 6px",
                    background: "var(--grad-cool)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 18,
                    boxShadow: "0 0 0 2px var(--bg), 0 0 0 4px rgba(34,211,238,0.5)",
                  }}>
                    {(displayName(it.profile || {}) || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.user_id === myId ? "You" : (displayName(it.profile || {}) || "Student").split(" ")[0]}
                  </div>
                  <div className="muted" style={{ fontSize: 10 }}>{it.location_tag}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="card stack" style={{ marginBottom: 16 }}>
          <div className="row" style={{ gap: 8 }}>
            <button className={`chip ${mode === "live" ? "on" : ""}`} onClick={() => setMode("live")}>
              Go live (2h)
            </button>
            <button className={`chip ${mode === "pulse" ? "on" : ""}`} onClick={() => setMode("pulse")}>
              Pulse note
            </button>
          </div>
          <textarea
            placeholder={
              mode === "live"
                ? "Heading to canteen - need 1 more for project..."
                : "Anonymous campus thought (vanishes in 6h)..."
            }
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            rows={2}
            maxLength={mode === "live" ? 100 : 280}
          />
          {mode === "live" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LOCATIONS.map((l) => (
                <button key={l} className={`chip ${loc === l ? "on" : ""}`} onClick={() => setLoc(l)}>
                  {l}
                </button>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={publish} disabled={!composer.trim() || posting}>
              {posting ? "Posting..." : mode === "live" ? "Broadcast" : "Post pulse"}
            </button>
            {mode === "live" && intents.some((i) => i.user_id === myId) && (
              <button className="btn-ghost btn-sm" onClick={stopLive}>End</button>
            )}
          </div>
        </div>

        <div className="row" style={{ gap: 8, marginBottom: 18 }}>
          <Link href="/discover" className="card" style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>Match</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Find peers</div>
          </Link>
          <Link href="/teams" className="card" style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>Teams</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Build</div>
          </Link>
          <Link href="/clubs" className="card" style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>Clubs</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Join</div>
          </Link>
        </div>

        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <h2 className="h2">Happening now</h2>
          <span className="muted" style={{ fontSize: 12 }}>{feed.length} updates</span>
        </div>

        {feed.length === 0 && (
          <div className="empty">
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Campus is quiet</p>
            <p className="muted" style={{ fontSize: 13 }}>Be first - broadcast where you are or drop a pulse</p>
          </div>
        )}

        {feed.map((item) => {
          if (item.kind === "intent") {
            const it = item.data;
            return (
              <div key={"i-" + it.id} className="card" style={{ marginBottom: 10 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <div className="h2" style={{ fontSize: 15 }}>{displayName(it.profile || {})}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{handleOf(it.profile || {})}</div>
                  </div>
                  <span className="badge" style={{ background: "rgba(34,211,238,0.15)", color: "var(--cyan)" }}>
                    {it.location_tag}
                  </span>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.45 }}>{it.message}</p>
                <div className="row" style={{ marginTop: 12, gap: 8 }}>
                  {it.user_id !== myId ? (
                    <Link href={"/chat/" + it.user_id} className="btn btn-sm">Ping - Chat</Link>
                  ) : (
                    <button className="btn-ghost btn-sm" onClick={stopLive}>End live</button>
                  )}
                  <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>
                    until {new Date(it.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          }
          const p = item.data;
          return (
            <div key={"p-" + p.id} className="card" style={{ marginBottom: 10 }}>
              <span className="badge">{p.is_anonymous !== false ? "Anonymous pulse" : "Named"}</span>
              <p style={{ fontSize: 15, marginTop: 8, lineHeight: 1.45 }}>{p.content}</p>
              <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
      </div>
      <Nav />
    </div>
  );
}
