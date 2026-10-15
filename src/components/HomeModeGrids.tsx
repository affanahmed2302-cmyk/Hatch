"use client";
import Link from "next/link";

type Mode = "professional" | "social" | "both";

/**
 * ONLY unique tools — never People / Lounge / Chat / Home (those are bottom nav only).
 */
export default function HomeModeGrids({
  mode,
  confessionOpen,
  onInvite,
  inviteMsg,
}: {
  mode: Mode;
  confessionOpen: boolean;
  onInvite: () => void;
  inviteMsg?: string;
}) {
  const showPro = mode === "professional" || mode === "both";
  const showSocial = mode === "social" || mode === "both";

  return (
    <>
      {(showPro || showSocial) && (
        <>
          <div className="section-label">More on campus</div>
          <div className="quick-grid" style={{ marginBottom: 8 }}>
            {showPro && (
              <>
                <Link href="/clubs" className="quick-tile emerald">
                  <span className="qt-ico">✦</span>
                  <div className="qt-title">Clubs</div>
                  <div className="qt-sub">Rank · events</div>
                </Link>
                <Link href="/schedule" className="quick-tile cyan">
                  <span className="qt-ico">📅</span>
                  <div className="qt-title">Schedule</div>
                  <div className="qt-sub">Classes</div>
                </Link>
              </>
            )}
            {showSocial && (
              <>
                <Link href="/hostel" className="quick-tile pink">
                  <span className="qt-ico">🏠</span>
                  <div className="qt-title">Hostel life</div>
                  <div className="qt-sub">Hang · needs</div>
                </Link>
                <Link href="/sparks" className="quick-tile violet">
                  <span className="qt-ico">◎</span>
                  <div className="qt-title">Circles</div>
                  <div className="qt-sub">Classmates</div>
                </Link>
              </>
            )}
            {!showSocial && showPro && (
              <>
                <Link href="/tools" className="quick-tile pink">
                  <span className="qt-ico">◇</span>
                  <div className="qt-title">Tools</div>
                  <div className="qt-sub">Internships</div>
                </Link>
                <Link href="/sparks" className="quick-tile violet">
                  <span className="qt-ico">◎</span>
                  <div className="qt-title">Circles</div>
                  <div className="qt-sub">Classmates</div>
                </Link>
              </>
            )}
          </div>
        </>
      )}

      {confessionOpen && showSocial && (
        <Link
          href="/confessions"
          className="card"
          style={{
            display: "block",
            marginBottom: 12,
            textDecoration: "none",
            color: "inherit",
            border: "1px solid rgba(167,139,250,0.35)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14 }}>🌙 Night notes</div>
          <p className="muted" style={{ fontSize: 12 }}>Anonymous · 10pm–5am</p>
        </Link>
      )}

      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={onInvite}
        style={{ marginBottom: 12, width: "100%" }}
      >
        ↗ Invite classmates
      </button>
      {inviteMsg && <div className="ok" style={{ marginBottom: 10 }}>{inviteMsg}</div>}
    </>
  );
}
