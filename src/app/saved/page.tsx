"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import { listSaved } from "@/lib/obsession";
import Nav from "@/components/Nav";

export default function SavedPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setRows(await listSaved(user.id));
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading...</span></div>;

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 12 }}>Saved people</h1>
        {rows.map((p) => (
          <Link key={p.id} href={"/chat/" + p.id} className="card row" style={{ display: "flex", marginBottom: 8, gap: 12, alignItems: "center" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)",
            }} />
            <div>
              <div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div>
              <p className="muted" style={{ fontSize: 12 }}>{p.department} · {(p.bio || "").slice(0, 40)}</p>
            </div>
          </Link>
        ))}
        {rows.length === 0 && <div className="empty"><p>No saved people yet — save from Discover</p></div>}
      </div>
      <Nav />
    </div>
  );
}
