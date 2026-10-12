"use client";

/** Quiet loading shell — matches app chrome so open never feels broken */
export default function AppSkeleton() {
  return (
    <div className="shell" aria-busy="true" aria-label="Loading">
      <div className="topbar">
        <div className="logo">HATCH</div>
      </div>
      <div className="page">
        <div className="skel skel-hero" />
        <div className="skel-grid">
          <div className="skel skel-tile" />
          <div className="skel skel-tile" />
          <div className="skel skel-tile" />
          <div className="skel skel-tile" />
        </div>
        <div className="skel skel-card" />
        <div className="skel skel-card" style={{ height: 120 }} />
      </div>
    </div>
  );
}
