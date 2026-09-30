"use client";
import { useEffect, useState } from "react";
import {
  isMidnightBlackout, blackoutCountdown, postMidnightDrop, fetchMidnightDrops,
} from "@/lib/legendary";

export default function MidnightBlackout({ userId }: { userId: string | null }) {
  const [active, setActive] = useState(false);
  const [cd, setCd] = useState("");
  const [drops, setDrops] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"confession" | "project" | "pulse">("confession");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setDrops(await fetchMidnightDrops());
  }

  useEffect(() => {
    const tick = () => {
      setActive(isMidnightBlackout());
      setCd(blackoutCountdown());
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active]);

  async function post() {
    if (!userId) return;
    const res = await postMidnightDrop(userId, text, kind);
    if (!res.ok) setErr(res.error || "Run hatch_legendary.sql");
    else { setText(""); setMsg("Dropped into the blackout"); setErr(""); await load(); }
  }

  if (!active) {
    return (
      <div className="card row" style={{
        marginBottom: 10, gap: 10, alignItems: "center",
        border: "1px solid rgba(139,92,246,0.25)",
      }}>
        <span style={{ fontSize: 18 }}>🌑</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Midnight Blackout</div>
          <p className="muted" style={{ fontSize: 11 }}>{cd} · 12:00–12:15 AM confessions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{
      marginBottom: 12,
      background: "linear-gradient(160deg,#0a0014 0%,#1a0533 50%,#0c0220 100%)",
      border: "1px solid rgba(192,132,252,0.55)",
      boxShadow: "0 0 40px rgba(168,85,247,0.25)",
      animation: "blackout-glow 3s ease-in-out infinite",
    }}>
      <div className="row" style={{ alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: "#e9d5ff" }}>MIDNIGHT BLACKOUT</div>
        <span className="badge" style={{ marginLeft: "auto", background: "#a855f7", color: "#fff" }}>LIVE</span>
      </div>
      <p className="muted" style={{ fontSize: 11, marginBottom: 8 }}>{cd} · synchronized campus drop</p>
      {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
      {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {(["confession", "project", "pulse"] as const).map((k) => (
          <button key={k} className={kind === k ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setKind(k)}>
            {k}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Drop it before the window closes…"
          maxLength={280}
          style={{ flex: 1, background: "rgba(0,0,0,0.35)" }}
        />
        <button className="btn btn-sm" onClick={post}>Drop</button>
      </div>
      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {drops.map((d) => (
          <div key={d.id} style={{
            padding: "8px 0", borderTop: "1px solid rgba(167,139,250,0.2)",
          }}>
            <span className="badge" style={{ fontSize: 10 }}>{d.kind}</span>
            <p style={{ fontSize: 14, marginTop: 4, color: "#f3e8ff" }}>{d.body}</p>
          </div>
        ))}
        {!drops.length && <p className="muted" style={{ fontSize: 12 }}>First drop owns the night…</p>}
      </div>
      <style>{`@keyframes blackout-glow { 0%,100% { box-shadow: 0 0 24px rgba(168,85,247,0.2); } 50% { box-shadow: 0 0 48px rgba(192,132,252,0.45); } }`}</style>
    </div>
  );
}
