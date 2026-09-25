"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/home");
    });
  }, [router]);

  return (
    <div className="shell" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, paddingBottom: 48 }}>
      <div className="fade-up" style={{ position: "relative", zIndex: 1 }}>
        <div className="logo" style={{ fontSize: 32, marginBottom: 28 }}>MESH</div>
        <h1 className="h1 glow-text" style={{ fontSize: 38, marginBottom: 14, lineHeight: 1.1 }}>
          Find teammates.<br />
          <span style={{
            background: "linear-gradient(135deg,#ec4899,#22d3ee)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>Ship projects.</span>
        </h1>
        <p className="muted" style={{ marginBottom: 36, fontSize: 15, lineHeight: 1.5 }}>
          BMS campus network · skills · clubs · real connections
        </p>
        <div className="stack">
          <Link href="/signup" className="btn" style={{ display: "block", textAlign: "center" }}>Get started</Link>
          <Link href="/login" className="btn-ghost" style={{ display: "block", textAlign: "center" }}>Log in</Link>
        </div>
        <div className="row" style={{ marginTop: 40, justifyContent: "center", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#a78bfa" }}>Live</div>
            <div className="muted" style={{ fontSize: 11 }}>status</div>
          </div>
          <div style={{ width: 1, height: 28, background: "var(--border)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#f472b6" }}>Match</div>
            <div className="muted" style={{ fontSize: 11 }}>skills</div>
          </div>
          <div style={{ width: 1, height: 28, background: "var(--border)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#22d3ee" }}>Clubs</div>
            <div className="muted" style={{ fontSize: 11 }}>campus</div>
          </div>
        </div>
      </div>
    </div>
  );
}
