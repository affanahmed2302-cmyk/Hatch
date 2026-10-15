"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { isCirclesActive } from "@/lib/features";

/** Official-safe: classmate connections for projects, fests, study — never "dating" in UI */
export default function SparksEntry() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    isCirclesActive().then(setOn);
  }, []);
  if (!on) return null;
  return (
    <Link
      href="/sparks"
      className="card"
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid rgba(167,139,250,0.35)",
        background: "linear-gradient(160deg,rgba(139,92,246,0.14),rgba(22,22,32,0.85))",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 14 }}>◎ Campus Circles</div>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        Meet verified classmates for projects, fests &amp; study groups · optional
      </p>
    </Link>
  );
}
