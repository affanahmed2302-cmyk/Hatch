"use client";
import Link from "next/link";

export default function Landing() {
  return (
    <div className="shell">
      <div className="page" style={{ paddingTop: 48 }}>
        <div style={{ letterSpacing: "0.18em", fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          HATCH · CAMPUS
        </div>
        <h1 className="h1" style={{ fontSize: 32, lineHeight: 1.15, marginBottom: 12 }}>
          Campus network built for real nights out with your squad.
        </h1>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 28 }}>
          Offline party games, I&apos;m Free on campus, and clean tools — professional design. Browse without signing
          in.
        </p>

        <Link href="/games" className="btn" style={{ display: "block", textAlign: "center", marginBottom: 12 }}>
          Open Squad Games (10 games)
        </Link>
        <Link
          href="/home"
          className="btn-ghost"
          style={{ display: "block", textAlign: "center", padding: "12px", marginBottom: 12 }}
        >
          Enter campus home
        </Link>
        <Link href="/login" className="muted" style={{ display: "block", textAlign: "center", fontSize: 13 }}>
          Optional sign-in later →
        </Link>

        <div style={{ marginTop: 36 }} className="stack">
          <div className="card">
            <div style={{ fontWeight: 700 }}>⚡ Truth or Dare + 9 more</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              1000 Truth/Dare prompts, Never Have I Ever, Most Likely To, Charades, and more — offline first.
            </p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700 }}>🟢 I&apos;m Free</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Library, canteen, ground — ping people who are free right now.
            </p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 700 }}>Professional theme</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Calm slate UI. Presentable to classmates and faculty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
