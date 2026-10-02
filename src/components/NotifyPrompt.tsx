"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ensureNotifyPermission } from "@/lib/notify";
import { registerPushSubscription } from "@/lib/pushClient";
import { supabase } from "@/lib/supabase";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/terms"];

export default function NotifyPrompt() {
  const [show, setShow] = useState(false);
  const path = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (PUBLIC_PATHS.includes(path || "/")) {
      setShow(false);
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setShow(false);
        return;
      }
      if (Notification.permission === "default") {
        const dismissed = localStorage.getItem("hatch_notify_dismiss");
        if (!dismissed) setShow(true);
      }
    })();
  }, [path]);

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
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Turn on call & chat alerts</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Install Hatch to Home Screen + Allow — so calls ring even when closed.
      </p>
      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn btn-sm"
          onClick={async () => {
            await ensureNotifyPermission();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await registerPushSubscription(user.id);
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
