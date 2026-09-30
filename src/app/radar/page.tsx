"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import {
  RADAR_INTENTS, setRadarIntent, fetchRadarPeers, requestBurner, myBurners, acceptBurner,
} from "@/lib/legendary";
import Nav from "@/components/Nav";

export default function RadarPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [burners, setBurners] = useState<any[]>([]);
  const [intent, setIntent] = useState("code");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh(uid: string, c?: { lat: number; lng: number } | null) {
    setPeers(await fetchRadarPeers(uid, c ?? coords));
    setBurners(await myBurners(uid));
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCoords(c);
            refresh(user.id, c);
          },
          () => refresh(user.id, null),
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        await refresh(user.id, null);
      }
      setLoading(false);
    })();
  }, [router]);

  async function broadcast() {
    if (!myId) return;
    const res = await setRadarIntent(myId, intent, "campus", coords);
    if (!res.ok) setErr(res.error || "Run hatch_legendary.sql");
    else { setMsg("Intent live · 45 min · ~50m zone when GPS on"); await refresh(myId); }
  }

  async function handshake(toId: string) {
    if (!myId) return;
    const res = await requestBurner(myId, toId);
    if (!res.ok) setErr(res.error || "Failed");
    else { setMsg("Burner sent · 1h window"); await refresh(myId); }
  }

  async function accept(id: string) {
    if (!myId) return;
    const res = await acceptBurner(id, myId);
    if (!res.ok) setErr(res.error || "Failed");
    else if (res.peer) {
      setMsg("Handshake locked · opening chat");
      router.push("/chat/" + res.peer);
    }
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Radar…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#030712" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#022c22,#0e7490)", border: "none" }}>
        <Link href="/home" className="btn-ghost btn-sm" style={{ color: "#fff" }}>←</Link>
        <div style={{ fontWeight: 900, color: "#5eead4", fontSize: 14 }}>Quantum Radar</div>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card" style={{
          marginBottom: 12, textAlign: "center",
          background: "radial-gradient(circle at 50% 40%, rgba(45,212,191,0.2), transparent 60%)",
          border: "1px solid rgba(45,212,191,0.35)",
        }}>
          <div style={{
            width: 120, height: 120, margin: "12px auto", borderRadius: "50%",
            border: "2px solid rgba(45,212,191,0.5)",
            boxShadow: "0 0 40px rgba(45,212,191,0.25)",
            animation: "radar-pulse 2.4s ease-out infinite",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: "#5eead4",
          }}>
            {coords ? "GPS on" : "Zone mode"}
          </div>
          <p className="muted" style={{ fontSize: 12 }}>Same intent · nearby peers · burner chats auto-expire in 1h</p>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Broadcast intent</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {RADAR_INTENTS.map((i) => (
              <button
                key={i.id}
                className={intent === i.id ? "btn btn-sm" : "btn-ghost btn-sm"}
                onClick={() => setIntent(i.id)}
              >{i.label}</button>
            ))}
          </div>
          <button className="btn" onClick={broadcast}>Ping radar</button>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>On radar</div>
          {peers.map((p) => (
            <div key={p.user_id} className="row" style={{ gap: 10, marginBottom: 10, alignItems: "center" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: p.profile?.avatar_url ? `url(${p.profile.avatar_url}) center/cover` : "var(--grad-cool)",
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{displayName(p.profile || {})}</div>
                <p className="muted" style={{ fontSize: 11 }}>
                  {p.intent}{p.distM != null ? ` · ~${p.distM}m` : " · campus zone"}
                </p>
              </div>
              <button className="btn btn-sm" onClick={() => handshake(p.user_id)}>Burner</button>
            </div>
          ))}
          {!peers.length && <p className="muted" style={{ fontSize: 12 }}>No peers yet — broadcast your intent</p>}
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>Burner handshakes</div>
          {burners.map((b) => (
            <div key={b.id} style={{ marginBottom: 8, fontSize: 13 }}>
              <span className="badge">{b.status}</span>
              {" "}expires {new Date(b.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {b.status === "pending" && b.b_id === myId && (
                <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => accept(b.id)}>Accept</button>
              )}
              {b.status === "active" && (
                <Link href={"/chat/" + (b.a_id === myId ? b.b_id : b.a_id)} className="btn-ghost btn-sm" style={{ marginLeft: 8 }}>
                  Chat
                </Link>
              )}
            </div>
          ))}
          {!burners.length && <p className="muted" style={{ fontSize: 12 }}>None active</p>}
        </div>
      </div>
      <Nav />
      <style>{`@keyframes radar-pulse { 0% { transform: scale(0.92); opacity: 0.85; } 70% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(0.92); opacity: 0.85; } }`}</style>
    </div>
  );
}
