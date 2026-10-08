"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import {
  fetchHostelProfile,
  fetchHostelRequests,
  fetchHostelListings,
  fetchHostelTips,
} from "@/lib/hostel";
import Nav from "@/components/Nav";

function timeLeft(iso?: string) {
  if (!iso) return "";
  const h = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 3600000));
  if (h < 1) return "expires soon";
  if (h < 24) return h + "h left";
  return Math.floor(h / 24) + "d left";
}

function hostelChatHref(userId: string, body: string, kind: "request" | "listing") {
  const label = kind === "request" ? "Hostel need" : "Hostel listing";
  const ctx = `${label}: ${body}`.slice(0, 160);
  return `/chat/${userId}?from=hostel&ctx=${encodeURIComponent(ctx)}`;
}

export default function HostelPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [reqs, setReqs] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUid(user.id);
      const hp = await fetchHostelProfile(user.id);
      setProfile(hp);
      if (!hp?.onboarded_at) {
        router.replace("/hostel/onboarding");
        return;
      }
      setReqs(await fetchHostelRequests(40));
      setListings(await fetchHostelListings(20));
      setTips(await fetchHostelTips(hp?.locality));
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading Hostel…</span>
      </div>
    );
  }

  const actions = [
    { href: "/hostel/need", icon: "🆘", title: "Need something", sub: "Food · laundry · rides · study" },
    { href: "/hostel/market", icon: "🛒", title: "Marketplace", sub: "Sell · borrow · free stuff" },
    { href: "/hostel/need?tab=tips", icon: "💡", title: "Local tips", sub: "PG · food · safety notes" },
    { href: "/profile", icon: "🏠", title: "Your living setup", sub: profile?.locality || profile?.living_type || "Edit on profile" },
  ];

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/explore" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Hatch Hostel</div>
        <Link href="/hostel/onboarding" className="btn-ghost btn-sm">Edit</Link>
      </div>
      <div className="page">
        <div className="card" style={{ marginBottom: 14, background: "linear-gradient(135deg,rgba(16,185,129,0.18),rgba(59,130,246,0.12))" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Your living hub</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {[profile?.living_type, profile?.locality, profile?.place_name].filter(Boolean).join(" · ") || "Hostel / PG tools for campus"}
          </p>
          {(profile?.budget || profile?.food_pref) && (
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {[profile?.budget && `Budget ${profile.budget}`, profile?.food_pref].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="card" style={{ textDecoration: "none", color: "inherit", marginBottom: 0, padding: 14 }}>
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
            <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
              <span className="badge">{r.category}</span>
              <span className="muted" style={{ fontSize: 11 }}>{timeLeft(r.expires_at)}</span>
            </div>
            <p style={{ fontSize: 14, marginTop: 8, fontWeight: 500 }}>{r.body}</p>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {displayName(r.profile || {})}
              {r.locality ? ` · ${r.locality}` : ""}
              {r.budget ? ` · ${r.budget}` : ""}
            </p>
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {r.user_id !== uid && (
                <Link href={hostelChatHref(r.user_id, r.body, "request")} className="btn btn-sm">
                  Chat about this
                </Link>
              )}
              <Link href={"/u/" + r.user_id} className="btn-ghost btn-sm">Profile</Link>
            </div>
          </div>
        ))}

        <div className="section-label">Marketplace</div>
        {listings.map((item) => (
          <div key={item.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong style={{ fontSize: 14 }}>{item.title}</strong>
              <span className="badge">{item.kind}</span>
            </div>
            {item.description && (
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{item.description}</p>
            )}
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {displayName(item.profile || {})}
              {item.price ? ` · ${item.price}` : ""}
              {item.category ? ` · ${item.category}` : ""}
            </p>
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              {item.user_id !== uid && (
                <Link href={hostelChatHref(item.user_id, item.title + (item.price ? " · " + item.price : ""), "listing")} className="btn btn-sm">
                  Message seller
                </Link>
              )}
              <Link href={"/u/" + item.user_id} className="btn-ghost btn-sm">Profile</Link>
            </div>
          </div>
        ))}
        {!listings.length && (
          <div className="card" style={{ marginBottom: 12 }}>
            <Link href="/hostel/market" className="btn btn-sm">List an item</Link>
          </div>
        )}

        <div className="section-label">Local tips</div>
        {tips.slice(0, 8).map((t) => (
          <div key={t.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.title}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{t.body}</p>
            {t.locality && <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>{t.locality}</p>}
          </div>
        ))}
        {!tips.length && (
          <div className="card" style={{ marginBottom: 12 }}>
            <p className="muted" style={{ fontSize: 13 }}>No tips yet — add one for your area.</p>
            <Link href="/hostel/need?tab=tips" className="btn btn-sm" style={{ marginTop: 8 }}>Add tip</Link>
          </div>
        )}

        <Link href="/home" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 8 }}>← Back to Hatch Home</Link>
      </div>
      <Nav />
    </div>
  );
}
