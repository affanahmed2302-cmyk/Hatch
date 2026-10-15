"use client";
import { useEffect } from "react";
import { playWordReveal, playOut } from "@/lib/splashSounds";

const SESSION_KEY = "hatch_splash_v9";
const HOLD_MS = 950;
const FADE_MS = 280;

/**
 * CRITICAL: Never call boot.remove() — #hatch-boot is rendered by React in layout.
 * Removing it from outside React corrupts the fiber tree →
 * NotFoundError insertBefore/removeChild on the next route change ("any other tab").
 * Only toggle CSS classes / aria-hidden / visibility.
 */
function hideBoot(boot: HTMLElement) {
  boot.classList.add("hatch-boot-out");
  boot.classList.add("hatch-boot-done");
  boot.setAttribute("aria-hidden", "true");
  boot.style.pointerEvents = "none";
  // Keep node in DOM; just hide after fade
  window.setTimeout(() => {
    boot.style.display = "none";
  }, FADE_MS + 40);
}

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
      boot.style.display = "none";
      boot.setAttribute("aria-hidden", "true");
      boot.classList.add("hatch-boot-done");
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
    }, HOLD_MS);

    const tHide = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* */
      }
      hideBoot(boot);
    }, HOLD_MS + FADE_MS);

    return () => {
      clearTimeout(tOut);
      clearTimeout(tHide);
    };
  }, []);

  return null;
}
