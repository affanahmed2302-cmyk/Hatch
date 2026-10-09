"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { isDatingAppActive } from "@/lib/features";

/** Only renders Sparks CTA when Pilot kill-switch is ON */
export default function SparksEntry() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    isDatingAppActive().then(setOn);
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
        border: "1px solid rgba(236,72,153,0.35)",
        background: "linear-gradient(160deg,rgba(236,72,153,0.14),rgba(22,22,32,0.85))",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 14 }}>✨ Sparks</div>
      <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>Campus dating · optional</p>
    </Link>
  );
}
