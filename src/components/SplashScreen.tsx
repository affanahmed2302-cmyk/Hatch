"use client";
import { useEffect, useState } from "react";

const SESSION_KEY = "hatch_splash_v1";

/**
 * Netflix-style intro:
 * 1) Energy H (option C) scales in with glow
 * 2) H slides left
 * 3) "atch" reveals → HATCH
 * 4) Fade out → app
 */
export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"icon" | "word" | "out">("icon");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* private mode */ }
    setShow(true);

    const t1 = setTimeout(() => setPhase("word"), 1100);
    const t2 = setTimeout(() => setPhase("out"), 2600);
    const t3 = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* */ }
      setShow(false);
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`hatch-splash ${phase === "out" ? "hatch-splash-out" : ""}`}
      aria-hidden
    >
      <div className="hatch-splash-inner">
        {/* Phase 1: Energy H mark (Option C) */}
        <div className={`hatch-splash-icon ${phase !== "icon" ? "hatch-splash-icon-gone" : ""}`}>
          <svg viewBox="0 0 120 120" width="88" height="88" aria-hidden>
            <defs>
              <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="55%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            {/* H stems */}
            <path
              fill="url(#hg)"
              d="M28 22h18v30h28V22h18v76H74V66H46v32H28V22z"
            />
            {/* Flame / energy in center */}
            <path
              fill="#ec4899"
              opacity="0.95"
              d="M60 48c4 8 14 10 14 22 0 10-6 16-14 16s-14-6-14-16c0-8 6-12 8-16 2-3 4-4 6-6z"
            />
            <path
              fill="#fbbf24"
              opacity="0.9"
              d="M60 58c2 4 7 5 7 11 0 5-3 8-7 8s-7-3-7-8c0-4 3-6 4-8 1-1 2-2 3-3z"
            />
          </svg>
        </div>

        {/* Phase 2: Netflix-style H → atch */}
        <div className={`hatch-splash-word ${phase === "icon" ? "hatch-splash-word-wait" : ""}`}>
          <span className="hatch-splash-h">H</span>
          <span className="hatch-splash-atch">atch</span>
        </div>
      </div>
    </div>
  );
}
