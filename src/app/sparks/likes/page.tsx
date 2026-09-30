"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, isSuperAdmin } from "@/lib/supabase";
import { isFeatureOn } from "@/lib/features";
import { fetchLikesYou, sparkSwipe } from "@/lib/sparks";
import SparksNav from "@/components/SparksNav";

export default function SparksLikesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load(uid: string) {
    setPeople(await fetchLikesYou(uid));
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const on = await isFeatureOn("feature_sparks");
      if (!on && !isSuperAdmin(user.email)) { router.replace("/home"); return; }
      setUserId(user.id);
      await load(user.id);
      setLoading(false);
    })();
  }, [router]);

  async function likeBack(id: string) {
    if (!userId) return;
    const res = await sparkSwipe(userId, id, true);
    if (res.matched) setMsg("Match! Open Matches tab");
    await load(userId);
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#0a0610" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#be185d,#7c3aed)", border: "none" }}>
        <div style={{ fontWeight: 900, color: "#fff" }}>Likes you</div>
      </div>
      <div className="page" style={{ paddingBottom: 90 }}>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {people.map((p) => (
          <div key={p.id} className="card row" style={{ marginBottom: 10, gap: 12, alignItems: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)",
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{displayName(p)}</div>
              <p className="muted" style={{ fontSize: 12 }}>{p.department}</p>
            </div>
            <button className="btn btn-sm" onClick={() => likeBack(p.id)}>♥ Back</button>
          </div>
        ))}
        {!people.length && <div className="empty"><p>No pending likes yet</p></div>}
      </div>
      <SparksNav />
    </div>
  );
}
