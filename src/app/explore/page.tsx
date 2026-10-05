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
          Everything live for every student — no hidden doors
        </p>

        <MidnightBlackout userId={uid} />
        {!isMidnightBlackout() && (
          <p className="muted" style={{ fontSize: 11, marginBottom: 12 }}>{blackoutCountdown()}</p>
        )}

        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, opacity: 0.7 }}>LIVE FOR YOU</div>
        {[
          { href: "/challenges", title: "Campus Challenges", blurb: "Daily missions · earn points" },
          { href: "/sparks", title: "Campus Sparks", blurb: "Dating · free at launch" },
          { href: "/teams", title: "Teams", blurb: "Project teammates · hackathons" },
          { href: "/clubs", title: "Clubs", blurb: "Club boards & events" },
          { href: "/lounge", title: "Lounge", blurb: "Open campus chat" },
          { href: "/radar", title: "Quantum Radar", blurb: "Nearby intents" },
          { href: "/ghost", title: "Ghost Teammate", blurb: "AI squad matcher" },
          { href: "/leaderboard", title: "Leaderboard", blurb: "Rep ranks" },
          { href: "/premium", title: "Premium", blurb: "Circle & extras" },
          { href: "/legends", title: "Legends of BMSCE", blurb: "Optional society chat" },
          { href: "/install", title: "Install app", blurb: "Home screen + alerts" },
        ].map((t) => (
          <Link key={t.href} href={t.href} className="card" style={{
            display: "block", marginBottom: 8, textDecoration: "none", color: "inherit",
            border: t.href === "/sparks" ? "1px solid rgba(244,114,182,0.4)" : undefined,
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
