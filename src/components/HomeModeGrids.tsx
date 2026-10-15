"use client";
import Link from "next/link";

type Mode = "professional" | "social" | "both";

/** Home shows next actions only — full menu lives in More (nav) */
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
  void mode;
  return (
    <>
      <div className="section-label">Next steps</div>
      <div className="quick-grid" style={{ marginBottom: 12 }}>
        <Link href="/discover" className="quick-tile violet">
          <span className="qt-ico">◎</span>
          <div className="qt-title">Discover</div>
          <div className="qt-sub">People</div>
        </Link>
        <Link href="/more" className="quick-tile cyan">
          <span className="qt-ico">☰</span>
          <div className="qt-title">More</div>
          <div className="qt-sub">Clubs · tools</div>
        </Link>
        <Link href="/clubs" className="quick-tile emerald">
          <span className="qt-ico">✦</span>
          <div className="qt-title">Clubs</div>
          <div className="qt-sub">Campus</div>
        </Link>
        <Link href="/teams" className="quick-tile pink">
          <span className="qt-ico">⬡</span>
          <div className="qt-title">Teams</div>
          <div className="qt-sub">Projects</div>
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
            border: "1px solid rgba(167,139,250,0.35)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14 }}>Confessions · open now</div>
          <p className="muted" style={{ fontSize: 12 }}>Anonymous · scheduled window</p>
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
      {inviteMsg && (
        <div className="ok" style={{ marginBottom: 10 }}>
          {inviteMsg}
        </div>
      )}
    </>
  );
}
