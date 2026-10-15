"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/** Product order: 1 primary purpose → 2 secondary → rest in tools */
const PRIMARY = {
  t: "Meet free people on campus",
  d: "I'm Free at Library, Canteen, Ground… Ping → chat in one tap",
};
const SECONDARY = {
  t: "Real campus chat",
  d: "DMs with voice, calls, gifts — only .ac.in students",
};
const MORE = [
  { t: "Find teammates", d: "Skills, year, department" },
  { t: "Lounge & Pulse", d: "Open campus channels" },
  { t: "More tools", d: "Hostel, schedule, clubs, opportunities" },
];

export default function Landing() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          router.replace("/home");
          return;
        }
      } catch {
        /* offline */
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!ready) {
    return <div className="shell" style={{ minHeight: "100dvh", background: "transparent" }} />;
  }

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, paddingBottom: 48, minHeight: "100dvh" }}>
      <div className="landing-glow" style={{ top: "12%", left: "50%", transform: "translateX(-50%)", background: "rgba(139,92,246,0.35)" }} />
      <div className="landing-glow" style={{ bottom: "18%", right: "-20%", background: "rgba(236,72,153,0.25)" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="logo" style={{ fontSize: 34, marginBottom: 8, letterSpacing: "0.08em" }}>HATCH</div>
        <p className="muted" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 22 }}>BMS campus network</p>
        <h1 className="h1" style={{ fontSize: 30, marginBottom: 12, lineHeight: 1.15 }}>
          Free on campus?<br />
          <span style={{ background: "linear-gradient(135deg,#ec4899,#a855f7,#22d3ee)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>Get Pinged.</span>
        </h1>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 18, maxWidth: 340 }}>
          {PRIMARY.d}. Only college Google (.ac.in) — no spam, no public email.
        </p>
        <div className="stack" style={{ marginBottom: 18 }}>
          <Link href="/signup" className="btn" style={{ textAlign: "center" }}>Join with college Google</Link>
          <Link href="/login" className="btn-ghost" style={{ textAlign: "center" }}>Log in</Link>
        </div>

        <div style={{ padding: "12px 14px", borderRadius: 14, marginBottom: 10, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(167,139,250,0.35)" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#c4b5fd" }}>#1 PURPOSE</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>{PRIMARY.t}</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{PRIMARY.d}</p>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: 14, marginBottom: 10, background: "rgba(236,72,153,0.1)", border: "1px solid rgba(244,114,182,0.3)" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#f9a8d4" }}>#2</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>{SECONDARY.t}</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{SECONDARY.d}</p>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {MORE.map((p) => (
            <div key={p.t} style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{p.t}</div>
              <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>{p.d}</p>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 18, textAlign: "center", lineHeight: 1.4 }}>
          College cannot track your Hatch activity · Email never shown on profile
        </p>
      </div>
    </div>
  );
}
