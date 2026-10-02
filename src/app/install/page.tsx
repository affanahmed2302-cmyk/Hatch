"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { ensureNotifyPermission } from "@/lib/notify";
import { registerPushSubscription } from "@/lib/pushClient";
import { supabase } from "@/lib/supabase";

const APP_URL = "https://hatch-primeora.vercel.app";

export default function InstallPage() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  async function installAndroid() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setMsg(outcome === "accepted" ? "Installed · open from home screen" : "Install dismissed");
    setDeferred(null);
    setCanInstall(false);
  }

  async function enableAlerts() {
    await ensureNotifyPermission();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await registerPushSubscription(user.id);
    setMsg("Alerts enabled — keep Hatch installed for call rings");
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Install Hatch</div>
      </div>
      <div className="page">
        <div className="card" style={{ marginBottom: 14, textAlign: "center" }}>
          <div className="logo" style={{ fontSize: 28, marginBottom: 8 }}>HATCH</div>
          <p className="muted" style={{ fontSize: 13 }}>
            Not an APK / App Store app — it&apos;s a <strong>PWA</strong> (web app you install to Home Screen).
            Works on iPhone + Android like a normal app icon.
          </p>
        </div>

        {msg && <div className="ok" style={{ marginBottom: 12 }}>{msg}</div>}

        {canInstall && (
          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={installAndroid}>
            Install Hatch now (Android)
          </button>
        )}

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">iPhone / iPad (Safari only)</div>
          <p style={{ fontSize: 13, lineHeight: 1.55 }}>
            1. Open <strong>Safari</strong> (not Chrome)<br />
            2. Go to <strong>{APP_URL}</strong><br />
            3. Tap the <strong>Share</strong> button (square with arrow)<br />
            4. Scroll → <strong>Add to Home Screen</strong><br />
            5. Open the Hatch icon · Log in · Allow notifications
          </p>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Android (Chrome)</div>
          <p style={{ fontSize: 13, lineHeight: 1.55 }}>
            1. Open <strong>Chrome</strong><br />
            2. Go to <strong>{APP_URL}</strong><br />
            3. Menu <strong>⋮</strong> → <strong>Install app</strong> / Add to Home screen<br />
            4. Open from home screen · Allow notifications for call rings
          </p>
        </div>

        <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={enableAlerts}>
          Enable call & chat alerts
        </button>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Share with campus</div>
          <p style={{ fontSize: 13, wordBreak: "break-all" }}>{APP_URL}</p>
          <button className="btn btn-sm" onClick={() => {
            navigator.clipboard?.writeText(APP_URL);
            setMsg("Link copied");
          }}>Copy link</button>
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>Why not Play Store / App Store?</div>
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>
            Hatch is a Progressive Web App. Same link for everyone — no APK sideload,
            no Apple review wait. Icon on home screen, fullscreen, notifications (best on installed PWA).
          </p>
        </div>
      </div>
      <Nav />
    </div>
  );
}
