"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureNotifyPermission } from "@/lib/notify";
import { registerPushSubscription } from "@/lib/pushClient";

const SKIP = ["/", "/login", "/signup", "/terms", "/auth/callback"];
const KEY = "hatch_perm_agent_v1";

/**
 * One-shot agent after login: notifications + optional mic hint.
 * Keeps people in the loop for messages, calls, I'm Free pings.
 */
export default function PermissionAgent() {
  const [step, setStep] = useState<null | "notify" | "done">(null);
  const path = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (SKIP.some((p) => path === p || (p !== "/" && path?.startsWith(p)))) {
      setStep(null);
      return;
    }
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      if (localStorage.getItem(KEY) === "1") return;
      if (!("Notification" in window)) {
        localStorage.setItem(KEY, "1");
        return;
      }
      if (Notification.permission === "granted") {
        try {
          await registerPushSubscription(user.id);
        } catch {
          /* */
        }
        localStorage.setItem(KEY, "1");
        return;
      }
      if (Notification.permission === "default") {
        setStep("notify");
      }
    })();
  }, [path]);

  if (step !== "notify") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120000,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: "min(420px, 100%)",
          marginBottom: 24,
          background: "linear-gradient(165deg,#1e1b4b,#0f0f14)",
          border: "1px solid rgba(167,139,250,0.45)",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Stay in the loop</div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>
          Allow notifications so you never miss a <strong style={{ color: "#e9d5ff" }}>message</strong>,{" "}
          <strong style={{ color: "#e9d5ff" }}>call</strong>, or <strong style={{ color: "#e9d5ff" }}>I&apos;m Free</strong> ping —
          even when Hatch is closed.
        </p>
        <button
          className="btn"
          style={{ width: "100%", marginBottom: 8 }}
          onClick={async () => {
            await ensureNotifyPermission();
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              try {
                await registerPushSubscription(user.id);
              } catch {
                /* */
              }
            }
            localStorage.setItem(KEY, "1");
            setStep("done");
          }}
        >
          Allow notifications
        </button>
        <button
          className="btn-ghost"
          style={{ width: "100%" }}
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setStep("done");
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
