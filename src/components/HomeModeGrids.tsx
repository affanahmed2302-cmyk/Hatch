"use client";
import Link from "next/link";
import SparksEntry from "./SparksEntry";

type Mode = "professional" | "social" | "both";

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
      <p className="muted" style={{ fontSize: 11, marginBottom: 10 }}>
        Mode: <strong style={{ color: "#e9d5ff" }}>{mode}</strong> · Settings
      </p>

      {showPro && (
        <>
          <div className="section-label">Professional</div>
          <div className="quick-grid">
            <Link href="/discover" className="quick-tile violet">
              <span className="qt-ico">◎</span>
              <div className="qt-title">Find people</div>
              <div className="qt-sub">Skills · teams</div>
            </Link>
            <Link href="/clubs" className="quick-tile emerald">
              <span className="qt-ico">✦</span>
              <div className="qt-title">Clubs</div>
              <div className="qt-sub">Events · cores</div>
            </Link>
            <Link href="/schedule" className="quick-tile cyan">
              <span className="qt-ico">📅</span>
              <div className="qt-title">Schedule</div>
              <div className="qt-sub">Classes</div>
            </Link>
            <Link href="/tools" className="quick-tile pink">
              <span className="qt-ico">◇</span>
              <div className="qt-title">Opportunities</div>
              <div className="qt-sub">Internships · tools</div>
            </Link>
          </div>
        </>
      )}

      {showSocial && (
        <>
          <div className="section-label">Campus social</div>
          <div className="quick-grid">
            <Link href="/lounge" className="quick-tile pink">
              <span className="qt-ico">◈</span>
              <div className="qt-title">Lounge</div>
              <div className="qt-sub">Open chat</div>
            </Link>
            <Link href="/inbox" className="quick-tile cyan">
              <span className="qt-ico">◇</span>
              <div className="qt-title">Messages</div>
              <div className="qt-sub">DMs</div>
            </Link>
            <Link href="/hostel" className="quick-tile emerald">
              <span className="qt-ico">🏠</span>
              <div className="qt-title">Hostel</div>
              <div className="qt-sub">Needs</div>
            </Link>
            <Link href="/radar" className="quick-tile violet">
              <span className="qt-ico">📡</span>
              <div className="qt-title">Radar</div>
              <div className="qt-sub">Nearby</div>
            </Link>
          </div>
          {confessionOpen && (
            <Link
              href="/confessions"
              className="card"
              style={{
                display: "block",
                marginBottom: 12,
                textDecoration: "none",
                color: "inherit",
                border: "1px solid rgba(167,139,250,0.4)",
                background: "linear-gradient(160deg,rgba(88,28,135,0.35),rgba(15,15,22,0.9))",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 14 }}>🌙 Night notes</div>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Anonymous · open 10pm–5am
              </p>
            </Link>
          )}
        </>
      )}

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        {showSocial && <SparksEntry />}
        <button
          type="button"
          className="card"
          onClick={onInvite}
          style={{
            flex: 1,
            textAlign: "left",
            marginBottom: 0,
            cursor: "pointer",
            border: "1px solid rgba(34,211,238,0.3)",
            background: "linear-gradient(160deg,rgba(34,211,238,0.12),rgba(22,22,32,0.85))",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14 }}>↗ Invite</div>
          <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>
            Share with classmates
          </p>
        </button>
      </div>
      {inviteMsg && (
        <div className="ok" style={{ marginBottom: 10 }}>
          {inviteMsg}
        </div>
      )}
    </>
  );
}
