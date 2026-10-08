"use client";
import { useEffect } from "react";
import InstallBanner from "./InstallBanner";
import LiveAlerts from "./LiveAlerts";
import NotifyPrompt from "./NotifyPrompt";
import PilotButton from "./PilotButton";
import SplashScreen from "./SplashScreen";
import ErrorBoundary from "./ErrorBoundary";
import OfflineBanner from "./OfflineBanner";
import { supabase } from "@/lib/supabase";
import { registerPushSubscription } from "@/lib/pushClient";
import { maybeDailyPeakNudge } from "@/lib/dailyNudge";
import { APP_VERSION } from "@/lib/appVersion";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    try {
      localStorage.setItem("hatch_app_version", APP_VERSION);
    } catch { /* */ }

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setTimeout(() => {
            registerPushSubscription(user.id).catch(() => {});
          }, 1500);
          setTimeout(() => {
            maybeDailyPeakNudge().catch(() => {});
          }, 2500);
        }
      } catch { /* offline */ }
    })();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        maybeDailyPeakNudge().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <SplashScreen />
      {children}
      <LiveAlerts />
      <NotifyPrompt />
      <InstallBanner />
      <PilotButton />
    </ErrorBoundary>
  );
}
