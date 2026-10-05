"use client";
import { useEffect, useState } from "react";

/** Bump key so users see the fixed splash once more */
const SESSION_KEY = "hatch_splash_v2";

/**
 * Phase A — full Option C Energy-H logo alone (big, centered)
 * Phase B — logo gone, then Netflix-style H → atch → HATCH
 * Phase C — fade to app
 */
export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"logo" | "word" | "out">("logo");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* private mode */
    }
    setShow(true);

    // Hold big C logo on screen
    const t1 = setTimeout(() => setPhase("word"), 1600);
    // Hold wordmark, then exit
    const t2 = setTimeout(() => setPhase("out"), 3400);
    const t3 = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* */
      }
      setShow(false);
    }, 4000);

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
      {/* STAGE 1 — Option C logo only (not stacked with text) */}
      <div
        className={`hatch-splash-stage hatch-splash-stage-logo ${
          phase === "logo" ? "is-active" : "is-done"
        }`}
      >
        <div className="hatch-splash-logo-wrap">
          <img
            src="/icon.svg"
            alt=""
            width={160}
            height={160}
            className="hatch-splash-logo-img"
            draggable={false}
          />
        </div>
      </div>

      {/* STAGE 2 — HATCH letters only (after logo fully clears) */}
      <div
        className={`hatch-splash-stage hatch-splash-stage-word ${
          phase === "word" ? "is-active" : ""
        }`}
      >
        <div className="hatch-splash-wordline">
          <span className="hatch-splash-h">H</span>
          <span className="hatch-splash-atch">atch</span>
        </div>
      </div>
    </div>
  );
}
