"use client";
import { useEffect, useState } from "react";
import { playWordReveal, playOut } from "@/lib/splashSounds";

/** v4 — no first logo frame (kills old circle mark forever) */
const SESSION_KEY = "hatch_splash_v4";

/**
 * Netflix-style intro ONLY:
 * H slides in → atch follows → HATCH → fade to app
 * No icon / no circle / no first mark
 */
export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"word" | "out">("word");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* */
    }
    setShow(true);
    playWordReveal();

    const t2 = setTimeout(() => {
      setPhase("out");
      playOut();
    }, 1800);
    const t3 = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* */
      }
      setShow(false);
    }, 2400);

    return () => {
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
      <div className="hatch-splash-stage hatch-splash-stage-word is-active">
        <div className="hatch-splash-wordline">
          <span className="hatch-splash-h">H</span>
          <span className="hatch-splash-atch">atch</span>
        </div>
      </div>
    </div>
  );
}
