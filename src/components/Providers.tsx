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

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setTimeout(() => {
            registerPushSubscription(user.id).catch(() => {});
          }, 1500);
        }
      } catch { /* offline */ }
    })();
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
