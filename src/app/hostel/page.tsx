"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import { fetchHostelProfile, fetchHostelRequests, fetchHostelListings, fetchHostelTips, type HostelProfile } from "@/lib/hostel";
import Nav from "@/components/Nav";

const ACTIONS = [
  { href: "/hostel/need", title: "Need something", sub: "Ask campus / hostel", icon: "🙋" },
  { href: "/hostel/market", title: "Buy · sell · borrow", sub: "Student marketplace", icon: "📦" },
  { href: "/hostel/need", title: "Local tips", sub: "Laundry, print, food", icon: "📌" },
  { href: "/discover", title: "Study partner", sub: "Find people on Hatch", icon: "📚" },
  { href: "/lounge", title: "Open chat", sub: "Campus lounge", icon: "💬" },
  { href: "/home", title: "I'm Free", sub: "On campus now", icon: "🟢" },
];

export default function HostelHubPage() {
  const [profile, setProfile] = useState<HostelProfile | null>(null);
  const [reqs, setReqs] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const hp = await fetchHostelProfile(user.id);
      if (!hp?.onboarded_at) { router.replace("/hostel/onboarding"); return; }
      setProfile(hp);
      const [r, l, t] = await Promise.all([
        fetchHostelRequests(12),
        fetchHostelListings(8),
        fetchHostelTips(hp.locality),
      ]);
      setReqs(r); setListings(l); setTips(t);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Hostel…</span>
      </div>
    );
  }

  const living = (profile?.living_type || "hostel").replace("_", " ");

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/explore" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Hatch Hostel</div>
        <Link href="/hostel/onboarding" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>Edit</Link>
      </div>
      <div className="page">
        <div className="card" style={{ marginBottom: 14, border: "1px solid rgba(52,211,153,0.35)", background: "linear-gradient(160deg,rgba(16,185,129,0.15),rgba(22,22,32,0.9))" }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Your living hub</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            {living} · {profile?.place_name || profile?.locality || "Campus area"} · {profile?.campus || "BMSCE"}
          </p>
          <p style={{ fontSize: 12, marginTop: 8, color: "#a7f3d0" }}>
            For hostels, PGs &amp; flats — needs outside your WhatsApp floor group.
          </p>
        </div>

        <div className="section-label">Quick actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {ACTIONS.map((a) => (
            <Link key={a.href + a.title} href={a.href} className="card" style={{ textDecoration: "none", color: "inherit", marginBottom: 0, padding: 14 }}>
              <div style={{ fontSize: 20 }}>{a.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 13, marginTop: 6 }}>{a.title}</div>
              <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>{a.sub}</p>
            </Link>
          ))}
        </div>

        <div className="section-label">Open requests</div>
        {reqs.length === 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <p className="muted" style={{ fontSize: 13 }}>No open requests yet.</p>
            <Link href="/hostel/need" className="btn btn-sm" style={{ marginTop: 10 }}>Post a need</Link>
          </div>
        )}
        {reqs.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 10 }}>
            <span className="badge">{r.category}</span>
            <p style={{ fontSize: 14, marginTop: 8, fontWeight: 500 }}>{r.body}</p>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{displayName(r.profile || {})}</p>
            <Link href={"/chat/" + r.user_id} className="btn btn-sm" style={{ marginTop: 8 }}>Help / chat</Link>
          </div>
        ))}

        <div className="section-label">Marketplace</div>
        {listings.map((item) => (
          <div key={item.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong style={{ fontSize: 14 }}>{item.title}</strong>
              <span className="badge">{item.kind}</span>
            </div>
            <Link href={"/chat/" + item.user_id} className="btn-ghost btn-sm" style={{ marginTop: 6 }}>Message</Link>
          </div>
        ))}
        {!listings.length && (
          <div className="card" style={{ marginBottom: 12 }}>
            <Link href="/hostel/market" className="btn btn-sm">List an item</Link>
          </div>
        )}

        <div className="section-label">Local tips</div>
        {tips.slice(0, 5).map((t) => (
          <div key={t.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.title}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{t.body}</p>
          </div>
        ))}

        <Link href="/home" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 8 }}>← Back to Hatch Home</Link>
      </div>
      <Nav />
    </div>
  );
}
