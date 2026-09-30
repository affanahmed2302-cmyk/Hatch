"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, displayName } from "@/lib/supabase";
import { fetchLeaderboard } from "@/lib/obsession";
import { fetchCollegeLeaderboard } from "@/lib/engagement";
import { collegeLabelFromPod } from "@/lib/college";
import Nav from "@/components/Nav";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"people" | "colleges">("people");
  const [rows, setRows] = useState<any[]>([]);
  const [colleges, setColleges] = useState<{ pod: string; rep: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const [p, c] = await Promise.all([fetchLeaderboard(25), fetchCollegeLeaderboard(20)]);
      setRows(p);
      setColleges(c);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading...</span></div>;

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 4 }}>Leaderboard</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Rep from posts, teams, and profile activity</p>

        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button className={tab === "people" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("people")}>People</button>
          <button className={tab === "colleges" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("colleges")}>College rivalry</button>
        </div>

        {tab === "people" && rows.map((p, i) => (
          <div key={p.id} className="card row" style={{ marginBottom: 8, gap: 12, alignItems: "center" }}>
            <span style={{ width: 28, fontWeight: 700, color: i < 3 ? "#a78bfa" : "var(--muted)" }}>#{i + 1}</span>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)",
            }} />
            <div style={{ flex: 1 }}>
              <div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div>
              <p className="muted" style={{ fontSize: 12 }}>
                {p.department || collegeLabelFromPod(p.college_pod || "campus")}
                {p.college_pod ? ` · ${collegeLabelFromPod(p.college_pod)}` : ""}
              </p>
            </div>
            <span className="badge">{p.rep_score || 0} rep</span>
          </div>
        ))}

        {tab === "colleges" && colleges.map((c, i) => (
          <div key={c.pod} className="card row" style={{ marginBottom: 8, gap: 12, alignItems: "center" }}>
            <span style={{ width: 28, fontWeight: 700, color: i < 3 ? "#fbbf24" : "var(--muted)" }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div className="h2" style={{ fontSize: 15 }}>{collegeLabelFromPod(c.pod)}</div>
              <p className="muted" style={{ fontSize: 12 }}>Total campus rep</p>
            </div>
            <span className="badge">{c.rep} rep</span>
          </div>
        ))}

        {tab === "people" && rows.length === 0 && <div className="empty"><p>No scores yet — post and connect to climb</p></div>}
        {tab === "colleges" && colleges.length === 0 && <div className="empty"><p>Run hatch_growth.sql · invite other colleges</p></div>}
      </div>
      <Nav />
    </div>
  );
}
