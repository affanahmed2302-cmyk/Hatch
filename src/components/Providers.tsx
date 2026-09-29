"use client";
import { useEffect } from "react";
import InstallBanner from "./InstallBanner";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return (
    <>
      {children}
      <InstallBanner />
    </>
  );
}
