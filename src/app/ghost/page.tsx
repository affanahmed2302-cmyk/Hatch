"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import { negotiateGhostSquad, latestGhostSquad } from "@/lib/legendary";
import Nav from "@/components/Nav";

export default function GhostPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [squad, setSquad] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      setSquad(await latestGhostSquad(user.id));
      setLoading(false);
    })();
  }, [router]);

  async function summon() {
    if (!myId) return;
    setBusy(true); setErr("");
    const res = await negotiateGhostSquad(myId);
    setBusy(false);
    if (!res.ok) setErr(res.error || "Run hatch_legendary.sql");
    else if (!res.squad) setMsg("Not enough skill signal yet — fill skills + GitHub on profile");
    else {
      setMsg(`Ghost negotiated a ${res.squad.score}% fit squad while you wait`);
      setSquad(await latestGhostSquad(myId));
    }
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Ghost…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#0a0a12" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#1e1b4b,#4c1d95)", border: "none" }}>
        <Link href="/home" className="btn-ghost btn-sm" style={{ color: "#fff" }}>←</Link>
        <div style={{ fontWeight: 900, color: "#c4b5fd", fontSize: 14 }}>Ghost Teammate</div>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card" style={{
          marginBottom: 14,
          background: "linear-gradient(160deg,rgba(99,102,241,0.25),rgba(168,85,247,0.12))",
          border: "1px solid rgba(167,139,250,0.4)",
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>AI negotiator</div>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
            Reads your skills, dept, GitHub signal and scores compatible teammates offline.
            One tap summons a suggested hackathon squad — no awkward cold DMs.
          </p>
          <button className="btn" style={{ marginTop: 12 }} onClick={summon} disabled={busy}>
            {busy ? "Negotiating…" : "Summon squad"}
          </button>
        </div>

        {squad?.members?.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="h2" style={{ marginBottom: 6 }}>Suggested squad · {squad.score || "—"}% blend</div>
            {squad.reason && <p className="muted" style={{ fontSize: 11, marginBottom: 10 }}>{squad.reason}</p>}
            {squad.members.map((m: any) => (
              <div key={m.id} className="row" style={{ gap: 10, marginBottom: 10, alignItems: "center" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: m.avatar_url ? `url(${m.avatar_url}) center/cover` : "var(--grad-cool)",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{displayName(m)}</div>
                  <p className="muted" style={{ fontSize: 11 }}>{m.department}{m.skills ? ` · ${String(m.skills).slice(0, 40)}` : ""}</p>
                </div>
                <Link href={"/chat/" + m.id} className="btn btn-sm">Invite</Link>
              </div>
            ))}
          </div>
        )}

        <p className="muted" style={{ fontSize: 11, textAlign: "center" }}>
          Tip: richer skills + GitHub on Profile → stronger ghost matches
        </p>
      </div>
      <Nav />
    </div>
  );
}
