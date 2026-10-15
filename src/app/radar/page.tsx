"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import {
  RADAR_INTENTS,
  setRadarIntent,
  fetchRadarPeers,
  requestBurner,
  myBurners,
  acceptBurner,
} from "@/lib/legendary";
import { getIsolationSet } from "@/lib/blocks";
import Nav from "@/components/Nav";

export default function RadarPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [burners, setBurners] = useState<any[]>([]);
  const [intent, setIntent] = useState("code");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [gpsNote, setGpsNote] = useState("Using campus zone (GPS optional)");
  const router = useRouter();

  async function refresh(uid: string, lat?: number, lng?: number) {
    try {
      const isolated = await getIsolationSet(uid);
      const list = await fetchRadarPeers(uid, lat, lng);
      setPeers((list || []).filter((p: any) => p.user_id && !isolated.has(p.user_id)));
      const b = await myBurners(uid);
      setBurners(b || []);
    } catch (e: any) {
      setErr(e?.message || "Radar load failed — try again");
    }
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setMyId(user.id);

      // GPS is optional — never hard-fail the page
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCoords(c);
            setGpsNote("GPS on · nearby peers");
            void refresh(user.id, c.lat, c.lng);
          },
          () => {
            setGpsNote("Zone mode · allow location for distance");
            void refresh(user.id);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
        );
      } else {
        setGpsNote("Zone mode · browser has no GPS");
        void refresh(user.id);
      }
    })();
  }, [router]);

  async function broadcast() {
    if (!myId) return;
    setErr("");
    try {
      const res = await setRadarIntent(myId, intent, coords?.lat, coords?.lng);
      if (res && (res as any).ok === false) {
        setErr((res as any).error || "Could not broadcast");
        return;
      }
      setMsg("Radar ping live · peers with same intent can see you");
      await refresh(myId, coords?.lat, coords?.lng);
    } catch (e: any) {
      setErr(e?.message || "Broadcast failed");
    }
  }

  async function handshake(peerId: string) {
    if (!myId) return;
    setErr("");
    try {
      const res = await requestBurner(myId, peerId);
      if (res && (res as any).ok === false) {
        setErr((res as any).error || "Handshake failed");
        return;
      }
      setMsg("Burner request sent · expires in 1h");
      await refresh(myId, coords?.lat, coords?.lng);
    } catch (e: any) {
      setErr(e?.message || "Handshake failed");
    }
  }

  async function accept(id: string) {
    if (!myId) return;
    try {
      await acceptBurner(id, myId);
      setMsg("Burner open");
      await refresh(myId, coords?.lat, coords?.lng);
    } catch (e: any) {
      setErr(e?.message || "Accept failed");
    }
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">
          ←
        </Link>
        <div className="logo" style={{ fontSize: 16 }}>
          Radar
        </div>
      </div>
      <div className="page">
        {msg && (
          <div className="ok" style={{ marginBottom: 10 }}>
            {msg}
          </div>
        )}
        {err && (
          <div className="fail" style={{ marginBottom: 10 }}>
            {err}
          </div>
        )}

        <div className="card" style={{ marginBottom: 12, textAlign: "center" }}>
          <div
            style={{
              width: 120,
              height: 120,
              margin: "0 auto 12px",
              borderRadius: "50%",
              border: "2px solid rgba(45,212,191,0.5)",
              boxShadow: "0 0 40px rgba(45,212,191,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "#5eead4",
            }}
          >
            {coords ? "GPS on" : "Zone mode"}
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            {gpsNote}
          </p>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Same intent · nearby peers · blocked people never appear
          </p>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Broadcast intent</div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {RADAR_INTENTS.map((i) => (
              <button
                key={i.id}
                type="button"
                className={intent === i.id ? "btn btn-sm" : "btn-ghost btn-sm"}
                onClick={() => setIntent(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn" onClick={broadcast}>
            Ping radar
          </button>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>
            On radar
          </div>
          {peers.map((p) => (
            <div key={p.user_id} className="row" style={{ gap: 10, marginBottom: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: p.profile?.avatar_url
                    ? `url(${p.profile.avatar_url}) center/cover`
                    : "var(--grad-cool)",
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{displayName(p.profile || {})}</div>
                <p className="muted" style={{ fontSize: 11 }}>
                  {p.intent}
                  {p.distM != null ? ` · ~${p.distM}m` : " · campus zone"}
                </p>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => handshake(p.user_id)}>
                Burner
              </button>
            </div>
          ))}
          {!peers.length && (
            <p className="muted" style={{ fontSize: 12 }}>
              No peers yet — broadcast your intent
            </p>
          )}
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>
            Burner handshakes
          </div>
          {burners.map((b) => (
            <div key={b.id} style={{ marginBottom: 8, fontSize: 13 }}>
              <span className="muted">{b.status || "pending"}</span>
              {b.status === "pending" && b.to_id === myId && (
                <button type="button" className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => accept(b.id)}>
                  Accept
                </button>
              )}
            </div>
          ))}
          {!burners.length && <p className="muted" style={{ fontSize: 12 }}>No burners yet</p>}
        </div>

        <div style={{ height: 88 }} />
      </div>
      <Nav />
    </div>
  );
}
