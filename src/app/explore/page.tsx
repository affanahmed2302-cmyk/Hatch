"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import { isFeatureOn } from "@/lib/features";
import { blackoutCountdown, isMidnightBlackout } from "@/lib/legendary";
import { EcosystemPortalGrid } from "@/components/EcosystemGateway";
import MidnightBlackout from "@/components/MidnightBlackout";
import Nav from "@/components/Nav";

const TOOLS = [
  { href: "/radar", title: "Quantum Radar", blurb: "Nearby intents · burner chats", tag: "Local" },
  { href: "/ghost", title: "Ghost Teammate", blurb: "AI squad for hackathons", tag: "AI" },
  { href: "/teams", title: "Teams", blurb: "Find project teammates", tag: "Build" },
  { href: "/clubs", title: "Clubs", blurb: "Campus clubs & join", tag: "Campus" },
  { href: "/leaderboard", title: "Leaderboard", blurb: "Rep & college ranks", tag: "Social" },
  { href: "/premium", title: "Premium", blurb: "Private Circle · ₹120", tag: "Pro" },
];

export default function ExplorePage() {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sparks, setSparks] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUid(user.id);
      setEmail(user.email || "");
      setSparks(await isFeatureOn("feature_sparks") || isSuperAdmin(user.email));
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Explore</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Extra tools live here so Home stays simple.
        </p>

        <MidnightBlackout userId={uid} />

        {!isMidnightBlackout() && (
          <p className="muted" style={{ fontSize: 11, marginBottom: 12 }}>{blackoutCountdown()}</p>
        )}

        <div className="stack" style={{ marginBottom: 16 }}>
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="card" style={{
              display: "block", textDecoration: "none", color: "inherit", marginBottom: 0,
            }}>
              <div className="row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.title}</div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{t.blurb}</p>
                </div>
                <span className="badge">{t.tag}</span>
              </div>
            </Link>
          ))}

          {sparks && (
            <Link href="/sparks" className="card" style={{
              display: "block", textDecoration: "none", color: "inherit",
              border: "1px solid rgba(236,72,153,0.35)",
            }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Campus Sparks</div>
              <p className="muted" style={{ fontSize: 12 }}>Private dating mini-app</p>
            </Link>
          )}

          {(isSuperAdmin(email)) && (
            <>
              <Link href="/pilot" className="card" style={{
                display: "block", textDecoration: "none", color: "#fff",
                background: "linear-gradient(135deg,#7c3aed,#db2777)",
              }}>
                <div style={{ fontWeight: 800 }}>CEO Pilot</div>
                <p style={{ fontSize: 12, opacity: 0.9 }}>Admin only</p>
              </Link>
              <Link href="/clubs-hq" className="btn-ghost" style={{ textAlign: "center" }}>Clubs HQ</Link>
              <Link href="/club-portal" className="btn-ghost" style={{ textAlign: "center" }}>Club Portal</Link>
            </>
          )}
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>Outside links</div>
          <EcosystemPortalGrid compact />
        </div>
      </div>
      <Nav />
    </div>
  );
}
