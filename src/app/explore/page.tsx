"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import { blackoutCountdown, isMidnightBlackout } from "@/lib/legendary";
import { EcosystemPortalGrid } from "@/components/EcosystemGateway";
import MidnightBlackout from "@/components/MidnightBlackout";
import Nav from "@/components/Nav";

export default function ExplorePage() {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUid(user.id);
      setEmail(user.email || "");
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Explore</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Balanced campus network · career · social · sparks
        </p>

        <MidnightBlackout userId={uid} />
        {!isMidnightBlackout() && (
          <p className="muted" style={{ fontSize: 11, marginBottom: 12 }}>{blackoutCountdown()}</p>
        )}

        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, opacity: 0.7 }}>CAMPUS CORE</div>
        {[
          { href: "/teams", title: "Teams", blurb: "Project teammates · hackathons" },
          { href: "/clubs", title: "Clubs", blurb: "Club cores & events" },
          { href: "/lounge", title: "Lounge", blurb: "Open campus chat" },
          { href: "/leaderboard", title: "Leaderboard", blurb: "Rep ranks" },
        ].map((t) => (
          <Link key={t.href} href={t.href} className="card" style={{
            display: "block", marginBottom: 8, textDecoration: "none", color: "inherit",
          }}>
            <div style={{ fontWeight: 700 }}>{t.title}</div>
            <p className="muted" style={{ fontSize: 12 }}>{t.blurb}</p>
          </Link>
        ))}

        <div style={{ fontWeight: 700, fontSize: 12, margin: "14px 0 8px", opacity: 0.7 }}>SECONDARY</div>
        <Link href="/sparks" className="card" style={{
          display: "block", marginBottom: 8, textDecoration: "none", color: "inherit",
          border: "1px solid rgba(244,114,182,0.35)",
        }}>
          <div style={{ fontWeight: 800 }}>Campus Sparks</div>
          <p className="muted" style={{ fontSize: 12 }}>Dating · free during launch · not on home</p>
        </Link>
        <Link href="/legends" className="card" style={{
          display: "block", marginBottom: 8, textDecoration: "none", color: "inherit",
        }}>
          <div style={{ fontWeight: 700 }}>Legends of BMSCE</div>
          <p className="muted" style={{ fontSize: 12 }}>Optional society chat</p>
        </Link>

        {[
          { href: "/radar", title: "Quantum Radar", blurb: "Nearby intents" },
          { href: "/ghost", title: "Ghost Teammate", blurb: "AI squad" },
          { href: "/install", title: "Install app", blurb: "Home screen" },
        ].map((t) => (
          <Link key={t.href} href={t.href} className="card" style={{
            display: "block", marginBottom: 8, textDecoration: "none", color: "inherit",
          }}>
            <div style={{ fontWeight: 700 }}>{t.title}</div>
            <p className="muted" style={{ fontSize: 12 }}>{t.blurb}</p>
          </Link>
        ))}

        {isSuperAdmin(email) && (
          <div className="stack" style={{ marginTop: 12 }}>
            <Link href="/pilot" className="btn" style={{ textAlign: "center" }}>CEO Pilot</Link>
            <Link href="/pilot/commerce" className="btn-ghost" style={{ textAlign: "center" }}>Coupons & payments</Link>
          </div>
        )}

        <div className="card" style={{ marginTop: 14 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Sister apps</div>
          <EcosystemPortalGrid compact />
        </div>
      </div>
      <Nav />
    </div>
  );
}
