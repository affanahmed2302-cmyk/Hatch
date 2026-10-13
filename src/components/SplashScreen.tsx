"use client";
import { useEffect } from "react";
import { playWordReveal, playOut } from "@/lib/splashSounds";

const SESSION_KEY = "hatch_splash_v7";
/** Match Web Audio hook (~0.78s) + short hold, then fade */
const HOLD_MS = 950;
const FADE_MS = 280;

/**
 * Professional boot sequence:
 * 1. HTML #hatch-boot is already visible before React
 * 2. Sound + letter animation start together
 * 3. Soft out tone when fade starts
 * 4. Same session → skip instantly
 */
export default function SplashScreen() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const boot = document.getElementById("hatch-boot");
    if (!boot) return;

    let seen = false;
    try {
      seen = !!sessionStorage.getItem(SESSION_KEY);
    } catch {
      /* */
    }

    if (seen) {
      boot.remove();
      return;
    }

    // Animation + sound start together
    boot.classList.add("hatch-boot-animate");
    try {
      playWordReveal();
    } catch {
      /* */
    }

    const tOut = window.setTimeout(() => {
      boot.classList.add("hatch-boot-out");
      try {
        playOut();
      } catch {
        /* */
      }
    }, HOLD_MS);

    const tHide = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* */
      }
      boot.remove();
    }, HOLD_MS + FADE_MS);

    return () => {
      clearTimeout(tOut);
      clearTimeout(tHide);
    };
  }, []);

  return null;
}
