"use client";
import { useEffect } from "react";
import InstallBanner from "./InstallBanner";
import LiveAlerts from "./LiveAlerts";
import NotifyPrompt from "./NotifyPrompt";
import PilotButton from "./PilotButton";
import SplashScreen from "./SplashScreen";
import ErrorBoundary from "./ErrorBoundary";
import GlobalErrorOverlay from "./GlobalErrorOverlay";
import OfflineBanner from "./OfflineBanner";
import ThemePreview from "./ThemePreview";
import { supabase } from "@/lib/supabase";
import { registerPushSubscription } from "@/lib/pushClient";
import { maybeDailyPeakNudge } from "@/lib/dailyNudge";
import { APP_VERSION } from "@/lib/appVersion";

const RECOVERY_KEY = "hatch_sw_recovery_v10";

async function forceCleanClient() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* */
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      try {
        const prev = localStorage.getItem("hatch_app_version");
        localStorage.setItem("hatch_app_version", APP_VERSION);

        if (prev && prev !== APP_VERSION && !sessionStorage.getItem(RECOVERY_KEY)) {
          sessionStorage.setItem(RECOVERY_KEY, "1");
          await forceCleanClient();
          window.location.reload();
          return;
        }

        if (sessionStorage.getItem("hatch_client_crash") === "1") {
          sessionStorage.removeItem("hatch_client_crash");
          await forceCleanClient();
        }
      } catch {
        /* */
      }

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js?v=10").catch(() => {});
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setTimeout(() => {
            registerPushSubscription(user.id).catch(() => {});
          }, 1500);
          setTimeout(() => {
            maybeDailyPeakNudge().catch(() => {});
          }, 2500);
        }
      } catch {
        /* offline */
      }
    })();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        maybeDailyPeakNudge().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemePreview />
      <OfflineBanner />
      <SplashScreen />
      {children}
      <LiveAlerts />
      <NotifyPrompt />
      <InstallBanner />
      <PilotButton />
      <GlobalErrorOverlay />
    </ErrorBoundary>
  );
}
