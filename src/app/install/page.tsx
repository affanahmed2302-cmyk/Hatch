"use client";
import Link from "next/link";
import Nav from "@/components/Nav";

const APP_URL = "https://hatch-primeora.vercel.app";

export default function InstallPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Get Hatch</div>
      </div>
      <div className="page">
        <div className="card" style={{ marginBottom: 14, textAlign: "center" }}>
          <div className="logo" style={{ fontSize: 28, marginBottom: 8 }}>HATCH</div>
          <p className="muted" style={{ fontSize: 13 }}>Campus network · install like an app</p>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">iPhone / iPad</div>
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>
            1. Open Safari → <strong>{APP_URL}</strong><br />
            2. Tap Share (□↑)<br />
            3. <strong>Add to Home Screen</strong>
          </p>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Android</div>
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>
            1. Open Chrome → <strong>{APP_URL}</strong><br />
            2. Menu ⋮ → <strong>Install app</strong> or Add to Home screen
          </p>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Share link</div>
          <p style={{ fontSize: 13, wordBreak: "break-all" }}>{APP_URL}</p>
          <button className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(APP_URL)}>Copy app link</button>
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>What&apos;s inside</div>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            • Find teammates & chat<br />
            • Campus Lounge<br />
            • Sparks dating · ₹150/mo<br />
            • Legends of BMSCE · ₹999/mo<br />
            • Clubs, radar, ghost squads
          </p>
        </div>
      </div>
      <Nav />
    </div>
  );
}
