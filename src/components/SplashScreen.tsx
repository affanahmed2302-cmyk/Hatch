"use client";
import { useEffect, useState } from "react";
import { playWordReveal, playOut } from "@/lib/splashSounds";

const SESSION_KEY = "hatch_splash_v5";

/** Fast HATCH intro — short, GPU-friendly, no laggy logo stage */
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

    // Defer paint + sound so first frame stays smooth
    const start = requestAnimationFrame(() => {
      setShow(true);
      // Sound after gesture-safe tick (still may mute until user taps once on iOS)
      try {
        playWordReveal();
      } catch {
        /* */
      }
    });

    const tOut = window.setTimeout(() => {
      setPhase("out");
      try {
        playOut();
      } catch {
        /* */
      }
    }, 1100);

    const tHide = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* */
      }
      setShow(false);
    }, 1450);

    return () => {
      cancelAnimationFrame(start);
      clearTimeout(tOut);
      clearTimeout(tHide);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`hatch-splash ${phase === "out" ? "hatch-splash-out" : ""}`}
      aria-hidden
      style={{ willChange: "opacity" }}
    >
      <div className="hatch-splash-stage hatch-splash-stage-word is-active">
        <div className="hatch-splash-wordline" style={{ willChange: "transform, opacity" }}>
          <span className="hatch-splash-h">H</span>
          <span className="hatch-splash-atch">atch</span>
        </div>
      </div>
    </div>
  );
}
