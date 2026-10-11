"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import {
  THEMES,
  getPreviewThemeId,
  setPreviewThemeId,
  clearPreviewTheme,
  type ThemeId,
} from "@/lib/themes";

export default function ThemeLabPage() {
  const [email, setEmail] = useState("");
  const [active, setActive] = useState<ThemeId>("current");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      if (!isSuperAdmin(user.email)) { router.replace("/home"); return; }
      setEmail(user.email || "");
      setActive(getPreviewThemeId());
      setLoading(false);
    })();
  }, [router]);

  function pick(id: ThemeId) {
    setPreviewThemeId(id);
    setActive(id);
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Theme lab…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/pilot" className="btn-ghost btn-sm">← Pilot</Link>
        <div className="logo" style={{ fontSize: 15, marginLeft: 8 }}>Theme Lab</div>
      </div>
      <div className="page">
        <div className="card" style={{ marginBottom: 14, border: "1px solid rgba(251,191,36,0.35)" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Preview only</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Themes apply <strong style={{ color: "var(--text)" }}>only in your browser</strong> via localStorage.
            Other users keep production look. Nothing is locked in until you confirm a theme with me.
          </p>
          <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Signed in as {email}</p>
        </div>

        <div className="section-label">Tap a theme → whole app restyles</div>
        {THEMES.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              className="card"
              style={{
                width: "100%",
                textAlign: "left",
                marginBottom: 10,
                cursor: "pointer",
                border: on ? "2px solid var(--violet)" : "1px solid var(--border)",
                boxShadow: on ? "0 0 0 3px var(--violet-glow)" : undefined,
              }}
            >
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{t.blurb}</p>
                  <p style={{ fontSize: 11, marginTop: 6, color: "var(--cyan)" }}>Best for: {t.bestFor}</p>
                </div>
                {on && (
                  <span className="badge" style={{ background: "var(--grad-primary)", color: "#0a0a0f", border: "none" }}>
                    LIVE
                  </span>
                )}
              </div>
              <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                {[t.vars["--bg"], t.vars["--violet"], t.vars["--magenta"], t.vars["--cyan"], t.vars["--amber"]].map(
                  (c, i) => (
                    <span
                      key={i}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: c,
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    />
                  )
                )}
              </div>
            </button>
          );
        })}

        <div className="section-label" style={{ marginTop: 8 }}>Live samples (this theme)</div>
        <div className="hero-card" style={{ marginBottom: 12 }}>
          <h1 className="h1" style={{ fontSize: 20, marginBottom: 4 }}>Hey Campus 👋</h1>
          <p className="muted" style={{ fontSize: 13 }}>Sample hero under active theme</p>
        </div>
        <div className="quick-grid" style={{ marginBottom: 12 }}>
          <div className="quick-tile violet">
            <span className="qt-ico">◎</span>
            <div className="qt-title">Find people</div>
            <div className="qt-sub">Sample tile</div>
          </div>
          <div className="quick-tile pink">
            <span className="qt-ico">◈</span>
            <div className="qt-title">Lounge</div>
            <div className="qt-sub">Sample tile</div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Sample card</div>
          <p className="muted" style={{ fontSize: 13 }}>Buttons and chips use theme gradients.</p>
          <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sm">Primary</button>
            <button type="button" className="btn-ghost btn-sm">Ghost</button>
            <span className="chip on">Chip on</span>
            <span className="chip">Chip</span>
          </div>
          <div className="ok" style={{ marginTop: 10 }}>Success message sample</div>
        </div>

        <div className="row" style={{ gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <Link href="/home" className="btn" style={{ flex: 1, textAlign: "center" }}>
            Open Home
          </Link>
          <Link href="/explore" className="btn-ghost" style={{ flex: 1, textAlign: "center" }}>
            Explore
          </Link>
        </div>
        <button
          type="button"
          className="btn-ghost"
          style={{ width: "100%", marginBottom: 40 }}
          onClick={() => { clearPreviewTheme(); setActive("current"); }}
        >
          Reset to production look
        </button>
      </div>
    </div>
  );
}
