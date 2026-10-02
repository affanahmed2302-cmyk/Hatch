"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "hatch_install_dismissed";

function isIosDevice() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|MicroMessenger|Snapchat/i.test(ua);
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [expand, setExpand] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (localStorage.getItem(KEY) === "1") return;

    const iosDev = isIosDevice();
    setIos(iosDev);
    setInApp(isInAppBrowser());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS / in-app: show install tip quickly
    const delay = iosDev || isInAppBrowser() ? 1200 : 3500;
    const t = setTimeout(() => setShow(true), delay);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      clearTimeout(t);
    };
  }, []);

  if (!show) return null;

  async function install() {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      setDeferred(null);
      if (choice?.outcome === "accepted") setShow(false);
    }
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
        border: "1px solid rgba(139,92,246,0.45)",
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg,#8b5cf6,#ec4899)",
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 18, color: "#fff",
          }}
        >
          H
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>
            {ios ? "Add Hatch to iPhone" : "Install Hatch"}
          </div>
          <p style={{ fontSize: 12, color: "#9494a8", lineHeight: 1.45 }}>
            {inApp
              ? "Open this page in Safari (⋯ → Open in Safari), then Add to Home Screen"
              : ios
                ? "Safari → Share button → Add to Home Screen — works like a normal app"
                : "Add to home screen · full-screen, no browser bar"}
          </p>

          {ios && expand && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#c4b5fd", lineHeight: 1.55 }}>
              <p><strong>1.</strong> Tap the <strong>Share</strong> icon at the bottom (□ with ↑)</p>
              <p><strong>2.</strong> Scroll down and tap <strong>Add to Home Screen</strong></p>
              <p><strong>3.</strong> Tap <strong>Add</strong> — open Hatch from your home screen</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {!ios && deferred && (
              <button
                onClick={install}
                style={{
                  background: "linear-gradient(135deg,#8b5cf6,#ec4899)",
                  color: "#0a0a0f", fontWeight: 800, border: "none",
                  borderRadius: 999, padding: "8px 16px", fontSize: 13, cursor: "pointer",
                }}
              >
                Install
              </button>
            )}
            {ios && (
              <button
                onClick={() => setExpand(!expand)}
                style={{
                  background: "linear-gradient(135deg,#8b5cf6,#ec4899)",
                  color: "#0a0a0f", fontWeight: 800, border: "none",
                  borderRadius: 999, padding: "8px 16px", fontSize: 13, cursor: "pointer",
                }}
              >
                {expand ? "Hide steps" : "Show steps"}
              </button>
            )}
            <Link
              href="/install"
              style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#e2e8f0", borderRadius: 999, padding: "8px 14px", fontSize: 13,
                textDecoration: "none", fontWeight: 600,
              }}
            >
              Full guide
            </Link>
            <button
              onClick={dismiss}
              style={{
                background: "transparent", border: "none", color: "#9494a8",
                borderRadius: 999, padding: "8px 10px", fontSize: 13, cursor: "pointer",
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
