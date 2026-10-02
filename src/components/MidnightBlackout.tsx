"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import {
  isMidnightBlackout, blackoutCountdown, postMidnightDrop, fetchMidnightDrops,
  sendSecretConfession, myIncomingSecrets, myOutgoingSecrets,
  markSecretInterested, offerReveal, resolveConfessionPeer,
} from "@/lib/legendary";

export default function MidnightBlackout({ userId }: { userId: string | null }) {
  const [active, setActive] = useState(false);
  const [cd, setCd] = useState("");
  const [drops, setDrops] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"confession" | "project" | "pulse">("confession");
  const [mode, setMode] = useState<"wall" | "secret" | "inbox">("wall");
  const [people, setPeople] = useState<any[]>([]);
  const [targetId, setTargetId] = useState("");
  const [secretText, setSecretText] = useState("");
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [revealed, setRevealed] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setDrops(await fetchMidnightDrops());
    if (userId) {
      setIncoming(await myIncomingSecrets(userId));
      setOutgoing(await myOutgoingSecrets(userId));
    }
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
    load();
  }, [active, userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, department, year")
        .neq("id", userId)
        .limit(60);
      setPeople(data || []);
    })();
  }, [userId]);

  async function post() {
    if (!userId) return;
    const res = await postMidnightDrop(userId, text, kind);
    if (!res.ok) setErr(res.error || "Run hatch_confessions.sql");
    else { setText(""); setMsg("Dropped on the anonymous wall"); setErr(""); await load(); }
  }

  async function sendSecret() {
    if (!userId || !targetId) return;
    const res = await sendSecretConfession(userId, targetId, secretText);
    if (!res.ok) setErr(res.error || "Run hatch_confessions.sql");
    else {
      setSecretText("");
      setMsg("Sent in secret — they won't see your name unless both reveal");
      setErr("");
      await load();
    }
  }

  async function interested(id: string) {
    if (!userId) return;
    await markSecretInterested(id, userId);
    setMsg("Marked curious — still anonymous");
    await load();
  }

  async function reveal(id: string) {
    if (!userId) return;
    const res = await offerReveal(id, userId);
    if (!res.ok) setErr(res.error || "Failed");
    else if (res.mutual) {
      setMsg("Mutual reveal! Names unlocked");
      const row = [...incoming, ...outgoing].find((x) => x.id === id);
      if (row) {
        const peer = await resolveConfessionPeer(row, userId);
        if (peer) setRevealed((r) => ({ ...r, [id]: peer }));
      }
    } else setMsg("You offered reveal — waiting for them");
    await load();
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
          <p className="muted" style={{ fontSize: 11 }}>{cd}</p>
          <p className="muted" style={{ fontSize: 10 }}>Anonymous wall + secret confessions · 12 AM–3 AM</p>
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
      <p className="muted" style={{ fontSize: 11, marginBottom: 8 }}>{cd}</p>

      <div className="row" style={{ gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <button className={mode === "wall" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setMode("wall")}>Anonymous wall</button>
        <button className={mode === "secret" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setMode("secret")}>Secret to someone</button>
        <button className={mode === "inbox" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setMode("inbox")}>
          Inbox {(incoming.length ? `(${incoming.length})` : "")}
        </button>
      </div>

      {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
      {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}

      {mode === "wall" && (
        <>
          <p className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
            Public board · <strong>no names ever</strong> · just the text
          </p>
          <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {(["confession", "project", "pulse"] as const).map((k) => (
              <button key={k} className={kind === k ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setKind(k)}>{k}</button>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Anonymous drop…"
              maxLength={280}
              style={{ flex: 1, background: "rgba(0,0,0,0.35)" }}
            />
            <button className="btn btn-sm" onClick={post}>Drop</button>
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {drops.map((d) => (
              <div key={d.id} style={{ padding: "8px 0", borderTop: "1px solid rgba(167,139,250,0.2)" }}>
                <span className="badge" style={{ fontSize: 10 }}>{d.kind}</span>
                <p style={{ fontSize: 14, marginTop: 4, color: "#f3e8ff" }}>{d.body}</p>
                <p className="muted" style={{ fontSize: 10 }}>Anonymous</p>
              </div>
            ))}
            {!drops.length && <p className="muted" style={{ fontSize: 12 }}>First drop owns the night…</p>}
          </div>
        </>
      )}

      {mode === "secret" && (
        <>
          <p className="muted" style={{ fontSize: 11, marginBottom: 8, lineHeight: 1.45 }}>
            Pick someone. They only see: <em>“Someone confessed”</em> + your words.
            Names unlock only if <strong>both</strong> tap Reveal.
          </p>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            style={{ width: "100%", marginBottom: 8, background: "rgba(0,0,0,0.35)", color: "#fff", padding: 10, borderRadius: 10 }}
          >
            <option value="">Select person…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {displayName(p)}{p.department ? ` · ${p.department}` : ""}
              </option>
            ))}
          </select>
          <textarea
            value={secretText}
            onChange={(e) => setSecretText(e.target.value)}
            placeholder="What would you say if they never knew it was you…"
            maxLength={400}
            rows={3}
            style={{ width: "100%", marginBottom: 8, background: "rgba(0,0,0,0.35)", color: "#fff", padding: 10, borderRadius: 10, border: "1px solid var(--border)" }}
          />
          <button className="btn" onClick={sendSecret} disabled={!targetId || secretText.length < 5}>
            Send in secret
          </button>
        </>
      )}

      {mode === "inbox" && (
        <div style={{ maxHeight: 280, overflowY: "auto" }}>
          <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, color: "#e9d5ff" }}>Received (anonymous)</p>
          {incoming.map((c) => (
            <div key={c.id} style={{ marginBottom: 12, padding: 10, borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(167,139,250,0.25)" }}>
              <p style={{ fontSize: 13, color: "#f3e8ff" }}>{c.body}</p>
              <p className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                From: {c.from_revealed && c.to_revealed && revealed[c.id]
                  ? displayName(revealed[c.id])
                  : "Hidden until mutual reveal"}
              </p>
              <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {!c.to_interested && (
                  <button className="btn-ghost btn-sm" onClick={() => interested(c.id)}>I'm curious</button>
                )}
                <button className="btn btn-sm" onClick={() => reveal(c.id)}>Reveal my side</button>
                {c.from_revealed && c.to_revealed && revealed[c.id] && (
                  <Link href={"/chat/" + revealed[c.id].id} className="btn-ghost btn-sm">Chat</Link>
                )}
              </div>
            </div>
          ))}
          {!incoming.length && <p className="muted" style={{ fontSize: 12 }}>No secret confessions yet</p>}

          <p style={{ fontWeight: 700, fontSize: 12, margin: "14px 0 8px", color: "#e9d5ff" }}>You sent</p>
          {outgoing.map((c) => (
            <div key={c.id} style={{ marginBottom: 8, fontSize: 12 }}>
              <p className="muted">Status: {c.status} · interested: {c.to_interested ? "yes" : "no"}</p>
              <p style={{ color: "#ddd" }}>{c.body.slice(0, 80)}…</p>
              <button className="btn-ghost btn-sm" onClick={() => reveal(c.id)}>Offer reveal</button>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes blackout-glow { 0%,100% { box-shadow: 0 0 24px rgba(168,85,247,0.2); } 50% { box-shadow: 0 0 48px rgba(192,132,252,0.45); } }`}</style>
    </div>
  );
}
