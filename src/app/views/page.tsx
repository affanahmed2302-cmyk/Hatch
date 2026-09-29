"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import { fetchRecentViews } from "@/lib/obsession";
import Nav from "@/components/Nav";

export default function ViewsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const v = await fetchRecentViews(user.id);
      setRows(v);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading…</span></div>;

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/profile" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 14 }}>Profile views</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Last 48 hours · people who opened your public profile</p>
        {rows.map((r, i) => (
          <Link key={i} href={"/u/" + r.viewer_id} className="card row" style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center", textDecoration: "none", color: "inherit" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: r.profile?.avatar_url ? `url(${r.profile.avatar_url}) center/cover` : "var(--grad-cool)",
            }} />
            <div style={{ flex: 1 }}>
              <div className="h2" style={{ fontSize: 15 }}>{displayName(r.profile || {})}</div>
              <p className="muted" style={{ fontSize: 11 }}>{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</p>
            </div>
          </Link>
        ))}
        {!rows.length && <div className="empty"><p>No views yet — share your profile link</p></div>}
      </div>
      <Nav />
    </div>
  );
}
