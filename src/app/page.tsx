"use client";
import Link from "next/link";

export default function Landing() {
  return (
    <div className="shell">
      <div className="page" style={{ paddingTop: 48 }}>
        <div style={{ letterSpacing: "0.18em", fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          HATCH · BMSCE
        </div>
        <h1 className="h1" style={{ fontSize: 30, lineHeight: 1.15, marginBottom: 12 }}>
          Campus network for people, teams, and tools.
        </h1>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 28 }}>
          Discover students, message connections, join campus life, and use student tools — built for BMSCE.
        </p>

        <Link href="/home" className="btn" style={{ display: "block", textAlign: "center", marginBottom: 12 }}>
          Enter Hatch
        </Link>
        <Link href="/login" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 12 }}>
          Sign in
        </Link>

        <div style={{ marginTop: 32 }} className="stack">
          <div className="card">
            <div style={{ fontWeight: 700 }}>I&apos;m Free</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Library, canteen, ground — see who is free on campus.
            </p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700 }}>Discover &amp; chat</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Find teammates by skills, year, and department.
            </p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700 }}>Clubs, radar, tools</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Circles, events, hostel hub, opportunities — under More.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
