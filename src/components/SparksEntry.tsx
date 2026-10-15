"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { isCirclesActive } from "@/lib/features";

/**
 * Soft-branded entry — NEVER say "dating" in UI (official / college-safe).
 * Product path stays /sparks internally.
 */
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
        flex: 1,
        textDecoration: "none",
        color: "inherit",
        marginBottom: 0,
        border: "1px solid rgba(167,139,250,0.35)",
        background: "linear-gradient(160deg,rgba(139,92,246,0.14),rgba(22,22,32,0.85))",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 14 }}>◎ Circles</div>
      <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>Meet classmates · optional</p>
    </Link>
  );
}
