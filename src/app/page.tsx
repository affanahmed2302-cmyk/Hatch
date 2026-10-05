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
    <div
      className="shell"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 28,
        paddingBottom: 48,
        minHeight: "100dvh",
      }}
    >
      <div
        className="landing-glow"
        style={{
          top: "12%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(139,92,246,0.35)",
        }}
      />
      <div
        className="landing-glow"
        style={{
          bottom: "18%",
          right: "-20%",
          background: "rgba(236,72,153,0.25)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="logo" style={{ fontSize: 34, marginBottom: 8, letterSpacing: "0.08em" }}>
          HATCH
        </div>
        <p
          className="muted"
          style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 22 }}
        >
          BMS campus network
        </p>

        <h1 className="h1" style={{ fontSize: 34, marginBottom: 14, lineHeight: 1.12 }}>
          Find teammates.
          <br />
          <span
            style={{
              background: "linear-gradient(135deg,#ec4899,#a855f7,#22d3ee)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Ship projects.
          </span>
        </h1>

        <p className="muted" style={{ marginBottom: 28, fontSize: 15, lineHeight: 1.55, maxWidth: 340 }}>
          Skills, clubs, chat, and real campus connections — built for BMSCE first.
        </p>

        <div className="pill-row" style={{ marginBottom: 28 }}>
          <span className="pill hot">Teams</span>
          <span className="pill hot">Clubs</span>
          <span className="pill">Chat</span>
          <span className="pill">Career</span>
        </div>

        <div className="stack">
          <Link href="/signup" className="btn" style={{ display: "block", textAlign: "center", fontSize: 16 }}>
            Get started
          </Link>
          <Link href="/login" className="btn-ghost" style={{ display: "block", textAlign: "center" }}>
            Log in
          </Link>
          <Link href="/install" className="muted" style={{ display: "block", textAlign: "center", fontSize: 12, marginTop: 4 }}>
            Install on phone →
          </Link>
        </div>
      </div>
    </div>
  );
}
