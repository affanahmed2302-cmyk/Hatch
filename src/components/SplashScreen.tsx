"use client";
import { useEffect } from "react";
import { playWordReveal, playOut } from "@/lib/splashSounds";

const SESSION_KEY = "hatch_splash_v11";
const HOLD_MS = 520;
const FADE_MS = 200;

function hideBoot(boot: HTMLElement) {
  boot.classList.add("hatch-boot-out");
  boot.classList.add("hatch-boot-done");
  boot.setAttribute("aria-hidden", "true");
  boot.style.pointerEvents = "none";
  try {
    document.documentElement.classList.add("hatch-booted");
  } catch {
    /* */
  }
  window.setTimeout(() => {
    boot.style.display = "none";
  }, FADE_MS + 30);
}

/** One splash per browser tab session — never double-flash */
export default function SplashScreen() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const boot = document.getElementById("hatch-boot");
    if (!boot) return;

    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* */
    }

    if (seen || document.documentElement.classList.contains("hatch-booted")) {
      boot.style.display = "none";
      boot.setAttribute("aria-hidden", "true");
      boot.classList.add("hatch-boot-done");
      document.documentElement.classList.add("hatch-booted");
      return;
    }

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* */
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
      hideBoot(boot);
    }, HOLD_MS + FADE_MS);

    return () => {
      clearTimeout(tOut);
      clearTimeout(tHide);
    };
  }, []);

  return null;
}
