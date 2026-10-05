"use client";
import { useEffect } from "react";
import InstallBanner from "./InstallBanner";
import LiveAlerts from "./LiveAlerts";
import NotifyPrompt from "./NotifyPrompt";
import PilotButton from "./PilotButton";
import SplashScreen from "./SplashScreen";
import { supabase } from "@/lib/supabase";
import { registerPushSubscription } from "@/lib/pushClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTimeout(() => registerPushSubscription(user.id), 1500);
      }
    })();
  }, []);
  return (
    <>
      <SplashScreen />
      {children}
      <LiveAlerts />
      <NotifyPrompt />
      <InstallBanner />
      <PilotButton />
    </>
  );
}
