"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PILLARS = [
  { t: "Find people", d: "Skills, year, department — connect in one tap" },
  { t: "I'm Free", d: "Show you're free on campus — get Pinged" },
  { t: "Campus chat", d: "DMs + Lounge channels for placements & teams" },
  { t: "Sparks", d: "Optional dating layer — same profile, extra prefs" },
];

export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/home");
    });
  }, [router]);

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, paddingBottom: 48, minHeight: "100dvh" }}>
      <div className="landing-glow" style={{ top: "12%", left: "50%", transform: "translateX(-50%)", background: "rgba(139,92,246,0.35)" }} />
      <div className="landing-glow" style={{ bottom: "18%", right: "-20%", background: "rgba(236,72,153,0.25)" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="logo" style={{ fontSize: 34, marginBottom: 8, letterSpacing: "0.08em" }}>HATCH</div>
        <p className="muted" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 22 }}>BMS campus network</p>
        <h1 className="h1" style={{ fontSize: 32, marginBottom: 12, lineHeight: 1.15 }}>
          Your campus.<br />
          <span style={{ background: "linear-gradient(135deg,#ec4899,#a855f7,#22d3ee)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>One network.</span>
        </h1>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 22, maxWidth: 340 }}>
          Find teammates, chat, go free on campus, and optionally Sparks — built for BMSCE students.
        </p>
        <div className="stack" style={{ marginBottom: 20 }}>
          <Link href="/signup" className="btn" style={{ textAlign: "center" }}>Join with college email</Link>
          <Link href="/login" className="btn-ghost" style={{ textAlign: "center" }}>Log in</Link>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {PILLARS.map((p) => (
            <div key={p.t} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{p.t}</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{p.d}</p>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 20, textAlign: "center" }}>Free for students · Install from browser for app-like use</p>
      </div>
    </div>
  );
}
