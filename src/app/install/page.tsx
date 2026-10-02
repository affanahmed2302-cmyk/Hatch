"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { ensureNotifyPermission } from "@/lib/notify";
import { registerPushSubscription } from "@/lib/pushClient";
import { supabase } from "@/lib/supabase";

const APP_URL = "https://hatch-primeora.vercel.app";

function detect() {
  if (typeof window === "undefined") {
    return { ios: false, android: false, standalone: false, inApp: false, safari: false };
  }
  const ua = navigator.userAgent || "";
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  const inApp = /FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|MicroMessenger/i.test(ua);
  const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/i.test(ua);
  return { ios, android, standalone, inApp, safari: ios ? /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua) : safari };
}

export default function InstallPage() {
  const [info, setInfo] = useState(detect());
  const [deferred, setDeferred] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setInfo(detect());
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  async function installAndroid() {
    if (!deferred) {
      setMsg("Use Chrome menu ⋮ → Install app");
      return;
    }
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setMsg(outcome === "accepted" ? "Installed! Open Hatch from your home screen." : "Install cancelled");
    setDeferred(null);
  }

  async function enableAlerts() {
    await ensureNotifyPermission();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await registerPushSubscription(user.id);
    setMsg("Notifications on — use the home-screen icon for best results");
  }

  const { ios, android, standalone, inApp, safari } = info;

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Install</div>
      </div>
      <div className="page">
        <div className="card" style={{ marginBottom: 14, textAlign: "center" }}>
          <div className="logo" style={{ fontSize: 28, marginBottom: 8 }}>HATCH</div>
          <p className="muted" style={{ fontSize: 13 }}>
            {standalone
              ? "You're already running Hatch as an app ✓"
              : "Add to Home Screen — works on iPhone & Android like Instagram"}
          </p>
        </div>

        {msg && <div className="ok" style={{ marginBottom: 12 }}>{msg}</div>}

        {standalone && (
          <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(52,211,153,0.4)" }}>
            <div style={{ fontWeight: 800, color: "#6ee7b7" }}>Installed</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Use this home-screen icon every time. Enable alerts below for calls.
            </p>
            <button className="btn" style={{ marginTop: 10, width: "100%" }} onClick={enableAlerts}>
              Enable call & chat alerts
            </button>
          </div>
        )}

        {!standalone && inApp && (
          <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(251,191,36,0.45)" }}>
            <div style={{ fontWeight: 800 }}>Open in Safari first</div>
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
              You opened Hatch inside another app (WhatsApp / Instagram).
              iPhone can only install from <strong>Safari</strong>.
            </p>
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
              Tap <strong>⋯</strong> or the menu → <strong>Open in Safari</strong> → then come back here.
            </p>
            <p className="muted" style={{ fontSize: 12, marginTop: 8, wordBreak: "break-all" }}>
              Or copy: {APP_URL}
            </p>
            <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => {
              navigator.clipboard?.writeText(APP_URL);
              setMsg("Link copied — paste in Safari");
            }}>Copy link for Safari</button>
          </div>
        )}

        {!standalone && ios && (
          <div className="card stack" style={{
            marginBottom: 12,
            border: "1px solid rgba(139,92,246,0.45)",
            background: "linear-gradient(160deg,rgba(124,58,237,0.15),rgba(15,15,20,0.9))",
          }}>
            <div className="h2">iPhone / iPad — 3 taps</div>
            {!safari && !inApp && (
              <p style={{ fontSize: 13, color: "#fbbf24" }}>
                Use <strong>Safari</strong> (blue compass icon), not Chrome.
              </p>
            )}

            <div style={{
              display: "grid", gap: 12, marginTop: 4,
            }}>
              {[
                { n: "1", t: "Tap Share", d: "Bottom center on iPhone — square with an upward arrow ↑" },
                { n: "2", t: "Add to Home Screen", d: "Scroll the share sheet if needed — look for the + Home Screen row" },
                { n: "3", t: "Tap Add", d: "Confirm. Hatch icon appears on your home screen — open from there" },
              ].map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg,#8b5cf6,#ec4899)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 14,
                  }}>{s.n}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{s.t}</div>
                    <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              Apple does not allow a one-tap Install button on iPhone — Share → Add to Home Screen is the normal way (same as many campus apps).
            </p>
          </div>
        )}

        {!standalone && android && (
          <div className="card stack" style={{ marginBottom: 12 }}>
            <div className="h2">Android</div>
            {deferred ? (
              <button className="btn" onClick={installAndroid}>Install Hatch now</button>
            ) : (
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>
                Chrome → menu <strong>⋮</strong> → <strong>Install app</strong> or <strong>Add to Home screen</strong>
              </p>
            )}
          </div>
        )}

        {!standalone && !ios && !android && (
          <div className="card stack" style={{ marginBottom: 12 }}>
            <div className="h2">Desktop / other</div>
            <p style={{ fontSize: 13 }}>Open in Chrome → install icon in the address bar, or use phone steps above.</p>
          </div>
        )}

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Share with friends</div>
          <p style={{ fontSize: 13, wordBreak: "break-all" }}>{APP_URL}</p>
          <button className="btn btn-sm" onClick={() => {
            navigator.clipboard?.writeText(APP_URL);
            setMsg("Link copied");
          }}>Copy link</button>
        </div>

        {!standalone && (
          <button className="btn-ghost" style={{ width: "100%" }} onClick={enableAlerts}>
            Enable notifications after install
          </button>
        )}
      </div>
      <Nav />
    </div>
  );
}
