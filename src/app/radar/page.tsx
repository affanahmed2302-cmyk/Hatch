"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import { RADAR_INTENTS, setRadarIntent, fetchRadarPeers } from "@/lib/legendary";
import { getIsolationSet } from "@/lib/blocks";
import Nav from "@/components/Nav";

/**
 * Simple campus intent board — NO burner / NO Jitsi.
 * Same idea as "I'm free to code / eat / chill" so people can DM.
 */
export default function RadarPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [intent, setIntent] = useState("code");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function refresh(uid: string) {
    try {
      const isolated = await getIsolationSet(uid);
      const list = await fetchRadarPeers(uid);
      setPeers((list || []).filter((p: any) => p.user_id && !isolated.has(p.user_id)));
    } catch (e: any) {
      setErr(e?.message || "Could not load");
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
      await refresh(user.id);
    })();
  }, [router]);

  async function broadcast() {
    if (!myId) return;
    setErr("");
    try {
      await setRadarIntent(myId, intent);
      setMsg("You're on the board · same intent can message you");
      await refresh(myId);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    }
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">
          ←
        </Link>
        <div className="logo" style={{ fontSize: 16 }}>
          Intent board
        </div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.45 }}>
          Pick what you&apos;re up for (code, food, walk). Others with the same intent show up — then open chat. No calls, no burner rooms.
        </p>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">I&apos;m up for</div>
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
            Show me on board
          </button>
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>
            On board now
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
                </p>
              </div>
              <Link href={"/chat/" + p.user_id} className="btn btn-sm">
                Chat
              </Link>
            </div>
          ))}
          {!peers.length && (
            <p className="muted" style={{ fontSize: 12 }}>
              Nobody yet — be first to broadcast
            </p>
          )}
        </div>
        <div style={{ height: 88 }} />
      </div>
      <Nav />
    </div>
  );
}
