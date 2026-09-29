"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, displayName } from "@/lib/supabase";
import { fetchLeaderboard } from "@/lib/obsession";
import Nav from "@/components/Nav";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setRows(await fetchLeaderboard(25));
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading...</span></div>;

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 4 }}>Campus leaderboard</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Rep from posts, teams, and profile activity</p>
        {rows.map((p, i) => (
          <div key={p.id} className="card row" style={{ marginBottom: 8, gap: 12, alignItems: "center" }}>
            <span style={{ width: 28, fontWeight: 700, color: i < 3 ? "#a78bfa" : "var(--muted)" }}>#{i + 1}</span>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)",
            }} />
            <div style={{ flex: 1 }}>
              <div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div>
              <p className="muted" style={{ fontSize: 12 }}>{p.department || "BMS"}</p>
            </div>
            <span className="badge">{p.rep_score || 0} rep</span>
          </div>
        ))}
        {rows.length === 0 && <div className="empty"><p>No scores yet — post and connect to climb</p></div>}
      </div>
      <Nav />
    </div>
  );
}
