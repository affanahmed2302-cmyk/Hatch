"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchPerks } from "@/lib/vibe";
import Nav from "@/components/Nav";

export default function PerksPage() {
  const [list, setList] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Student");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
      if (p?.full_name) setName(p.full_name);
      else if (p?.username) setName("@" + p.username);
      const res = await fetchPerks();
      if (!res.ok) setErr(res.error || "Could not load perks");
      setList(res.data || []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 4 }}>Campus perks</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Bull Temple Road · show digital badge</p>
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>hatch membership</div>
          <div className="h2">{name}</div>
          <div className="badge" style={{ marginTop: 8 }}>Verified BMSCE</div>
        </div>
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
        {list.map((p) => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="h2">{p.merchant_name}</div>
              <span className="badge">{p.discount_label}</span>
            </div>
            <p style={{ fontSize: 14, marginTop: 6 }}>{p.title}</p>
            {p.description && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{p.description}</p>}
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{p.location_hint} · {p.category}</p>
          </div>
        ))}
        {list.length === 0 && !err && <div className="empty"><p>No perks yet — run SQL migration</p></div>}
      </div>
      <Nav />
    </div>
  );
}
