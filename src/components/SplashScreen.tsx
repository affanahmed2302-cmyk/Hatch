"use client";
import { useEffect, useState } from "react";
import { playLogoIn, playWordReveal, playOut } from "@/lib/splashSounds";

const SESSION_KEY = "hatch_splash_v3";

/** Option C Energy-H — inline so old ring logo never appears even if icon.svg cached */
function EnergyHLogo({ size = 168 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className="hatch-splash-logo-img"
      aria-hidden
    >
      <defs>
        <linearGradient id="splashHg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="45%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="splashFlame" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="55%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#c026d3" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="#07070c" />
      <path
        fill="url(#splashHg)"
        d="M96 88h88v128h144V88h88v336h-88V280H184v144H96V88z"
      />
      <path
        fill="url(#splashFlame)"
        d="M256 168c18 36 64 48 64 104 0 48-28 80-64 80s-64-32-64-80c0-40 28-58 40-78 10-16 16-20 24-26z"
      />
      <path
        fill="#fde68a"
        opacity="0.95"
        d="M256 220c10 18 32 24 32 52 0 24-14 40-32 40s-32-16-32-40c0-20 14-28 20-38 4-6 8-10 12-14z"
      />
    </svg>
  );
}

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"logo" | "word" | "out">("logo");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* */
    }
    setShow(true);

    // Unlock audio on first paint (mobile needs user gesture sometimes — try anyway)
    const tSoundLogo = setTimeout(() => playLogoIn(), 80);
    const t1 = setTimeout(() => {
      setPhase("word");
      playWordReveal();
    }, 1600);
    const t2 = setTimeout(() => {
      setPhase("out");
      playOut();
    }, 3400);
    const t3 = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* */
      }
      setShow(false);
    }, 4000);

    return () => {
      clearTimeout(tSoundLogo);
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
      <div
        className={`hatch-splash-stage hatch-splash-stage-logo ${
          phase === "logo" ? "is-active" : "is-done"
        }`}
      >
        <div className="hatch-splash-logo-wrap">
          <EnergyHLogo size={168} />
        </div>
      </div>

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
