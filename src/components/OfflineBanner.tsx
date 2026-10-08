"use client";
import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const up = () => setOffline(false);
    const down = () => setOffline(true);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "10px 14px",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 700,
        background: "linear-gradient(90deg,#b45309,#f59e0b)",
        color: "#0a0a0a",
      }}
    >
      You're offline — some actions will wait until you're back
    </div>
  );
}
