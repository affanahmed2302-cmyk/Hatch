"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, isSuperAdmin } from "@/lib/supabase";
import { isFeatureOn } from "@/lib/features";
import { fetchMatches } from "@/lib/sparks";
import SparksNav from "@/components/SparksNav";

export default function SparksMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const on = await isFeatureOn("feature_sparks");
      if (!on && !isSuperAdmin(user.email)) { router.replace("/home"); return; }
      setMatches(await fetchMatches(user.id));
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#0a0610" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#be185d,#7c3aed)", border: "none" }}>
        <div style={{ fontWeight: 900, color: "#fff" }}>Matches</div>
      </div>
      <div className="page" style={{ paddingBottom: 90 }}>
        {matches.map((m) => (
          <div key={m.profile.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: m.profile.avatar_url ? `url(${m.profile.avatar_url}) center/cover` : "var(--grad-cool)",
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{displayName(m.profile)}</div>
                {m.spark?.headline && <p className="muted" style={{ fontSize: 12 }}>{m.spark.headline}</p>}
              </div>
            </div>
            <Link href={"/chat/" + m.profile.id} className="btn" style={{ display: "block", textAlign: "center", marginTop: 10 }}>
              Message
            </Link>
          </div>
        ))}
        {!matches.length && <div className="empty"><p>No matches yet — keep swiping on Discover</p></div>}
      </div>
      <SparksNav />
    </div>
  );
}
