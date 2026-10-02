"use client";
import { useEffect, useState } from "react";
import { ensureNotifyPermission } from "@/lib/notify";

export default function NotifyPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      const dismissed = localStorage.getItem("hatch_notify_dismiss");
      if (!dismissed) setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 95,
        width: "min(420px, 92vw)",
        background: "linear-gradient(135deg,#1e1b4b,#312e81)",
        border: "1px solid rgba(139,92,246,0.5)",
        borderRadius: 16,
        padding: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Turn on notifications</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Get alerts for messages, calls, and when friends are free on campus.
      </p>
      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn btn-sm"
          onClick={async () => {
            await ensureNotifyPermission();
            setShow(false);
          }}
        >
          Allow
        </button>
        <button
          className="btn-ghost btn-sm"
          onClick={() => {
            localStorage.setItem("hatch_notify_dismiss", "1");
            setShow(false);
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
