"use client";
import { useEffect, useState } from "react";

const KEY = "hatch_install_dismissed";

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setStandalone(isStandalone);
    if (isStandalone) return;
    if (localStorage.getItem(KEY) === "1") return;

    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
    setIos(isIOS);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS never fires beforeinstallprompt — show manual tip after short delay
    if (isIOS) {
      const t = setTimeout(() => setShow(true), 1800);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
    }

    // Android / desktop Chromium: also show a soft tip if prompt never fires
    const t2 = setTimeout(() => {
      if (!isStandalone) setShow(true);
    }, 4000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      clearTimeout(t2);
    };
  }, []);

  if (standalone || !show) return null;

  async function install() {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      setDeferred(null);
      if (choice?.outcome === "accepted") setShow(false);
      return;
    }
    // iOS / no prompt — keep banner with instructions
  }

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setShow(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(72px + env(safe-area-inset-bottom))",
        width: "min(440px, calc(100% - 24px))",
        zIndex: 50,
        background: "linear-gradient(135deg, rgba(20,20,32,0.98), rgba(12,12,20,0.98))",
        border: "1px solid rgba(139,92,246,0.4)",
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg,#8b5cf6,#ec4899)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 18,
            color: "#fff",
          }}
        >
          H
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>Install Hatch</div>
          <p style={{ fontSize: 12, color: "#9494a8", lineHeight: 1.4 }}>
            {ios
              ? "Tap Share → Add to Home Screen — opens full-screen like Instagram"
              : "Add to home screen · full-screen app, no browser bar"}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {!ios && deferred && (
              <button
                onClick={install}
                style={{
                  background: "linear-gradient(135deg,#8b5cf6,#ec4899)",
                  color: "#0a0a0f",
                  fontWeight: 800,
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Install
              </button>
            )}
            <button
              onClick={dismiss}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#9494a8",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
