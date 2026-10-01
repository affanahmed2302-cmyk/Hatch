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

export default function ExplorePage() {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sparksFlag, setSparksFlag] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUid(user.id);
      setEmail(user.email || "");
      // Sparks is always marketed; paywall is inside the app
      setSparksFlag(true);
      void isFeatureOn("feature_sparks");
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
          Premium experiences & campus tools.
        </p>

        <Link href="/sparks" className="card" style={{
          display: "block", marginBottom: 10, textDecoration: "none", color: "inherit",
          background: "linear-gradient(135deg,rgba(236,72,153,0.22),rgba(124,58,237,0.15))",
          border: "1px solid rgba(244,114,182,0.45)",
        }}>
          <div style={{ fontWeight: 900, fontSize: 17 }}>Campus Sparks · Dating</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Swipe · match · chat · BMSCE only · <strong>₹150/month</strong>
          </p>
        </Link>

        <Link href="/legends" className="card" style={{
          display: "block", marginBottom: 10, textDecoration: "none", color: "inherit",
          background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(120,53,15,0.2))",
          border: "1px solid rgba(251,191,36,0.45)",
        }}>
          <div style={{ fontWeight: 900, fontSize: 17 }}>Legends of BMSCE</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Private society chatbox · <strong>₹999/month</strong>
          </p>
        </Link>

        <Link href="/install" className="card" style={{
          display: "block", marginBottom: 12, textDecoration: "none", color: "inherit",
        }}>
          <div style={{ fontWeight: 800 }}>Install Hatch on phone</div>
          <p className="muted" style={{ fontSize: 12 }}>Add to Home Screen · works like an app</p>
        </Link>

        <MidnightBlackout userId={uid} />
        {!isMidnightBlackout() && (
          <p className="muted" style={{ fontSize: 11, marginBottom: 12 }}>{blackoutCountdown()}</p>
        )}

        {[
          { href: "/radar", title: "Quantum Radar", blurb: "Nearby intents · burner chats" },
          { href: "/ghost", title: "Ghost Teammate", blurb: "AI hackathon squad" },
          { href: "/teams", title: "Teams", blurb: "Project teammates" },
          { href: "/clubs", title: "Clubs", blurb: "Campus clubs" },
          { href: "/leaderboard", title: "Leaderboard", blurb: "Rep ranks" },
          { href: "/premium", title: "Hatch Premium", blurb: "₹120 · Private Circle" },
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
          <div className="h2" style={{ marginBottom: 8 }}>Outside links</div>
          <EcosystemPortalGrid compact />
        </div>
      </div>
      <Nav />
    </div>
  );
}
