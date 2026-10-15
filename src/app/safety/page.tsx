"use client";
import Link from "next/link";
import Nav from "@/components/Nav";

const CONTACTS = [
  { title: "Campus Security", detail: "Report to nearest security post · 24×7 surveillance", action: "Ask wardens / main gate" },
  { title: "Health Care Centre", detail: "On-campus medical attention for students", action: "Visit Health Centre" },
  { title: "Hostel Warden", detail: "Boys / Girls hostel units · curfew & permissions", action: "Contact your unit office" },
  { title: "Emergency (India)", detail: "Police 100 · Ambulance 108 · Women helpline 1091", action: "Call when needed" },
];

export default function SafetyPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/tools" className="btn-ghost btn-sm">← Tools</Link>
        <div className="logo" style={{ fontSize: 15 }}>Campus Safety</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Quick references for BMSCE — not a substitute for official numbers posted on campus.
        </p>
        {CONTACTS.map((c) => (
          <div key={c.title} className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>{c.title}</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{c.detail}</p>
            <p style={{ fontSize: 12, marginTop: 6, color: "#a7f3d0" }}>{c.action}</p>
          </div>
        ))}
        <div className="card" style={{ border: "1px solid rgba(251,191,36,0.35)" }}>
          <div style={{ fontWeight: 800 }}>If you feel unsafe</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Move to a public area (Library / Main gate / Canteen), tell a friend on Hatch, and contact security.
          </p>
        </div>
      </div>
      <Nav />
    </div>
  );
}
