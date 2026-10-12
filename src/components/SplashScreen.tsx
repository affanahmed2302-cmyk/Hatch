"use client";
import { useEffect } from "react";
import { playWordReveal, playOut } from "@/lib/splashSounds";

const SESSION_KEY = "hatch_splash_v6";
const MIN_MS = 1400;
const FADE_MS = 320;

/**
 * Professional boot sequence:
 * 1. HTML #hatch-boot is already visible before React (no blank / Loading flash)
 * 2. Animate word once per session, then fade and remove
 * 3. Revisit same session → hide boot instantly
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
    }, MIN_MS);

    const tHide = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* */
      }
      boot.remove();
    }, MIN_MS + FADE_MS);

    return () => {
      clearTimeout(tOut);
      clearTimeout(tHide);
    };
  }, []);

  return null;
}
