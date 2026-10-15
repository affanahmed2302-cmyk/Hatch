"use client";
import Link from "next/link";
import Nav from "@/components/Nav";

const SPOTS = [
  { name: "Main Canteen", tip: "Peak lunch 12:30–1:30 · go early or late" },
  { name: "Cafeteria / PJ", tip: "Coffee + short hangs between classes" },
  { name: "Hostel Mess", tip: "Breakfast ~7:30–9 · Lunch 12:30–2 · Dinner 7:30–9" },
  { name: "Architecture Park", tip: "Chill outdoor · food runs meet-up spot" },
];

export default function MessPage() {
  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/tools" className="btn-ghost btn-sm">← Tools</Link>
        <div className="logo" style={{ fontSize: 15 }}>Mess & Canteen</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>BMSCE food spots — pair with I'm Free for food runs.</p>
        {SPOTS.map((s) => (
          <div key={s.name} className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>{s.name}</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{s.tip}</p>
          </div>
        ))}
        <Link href="/home" className="btn" style={{ display: "block", textAlign: "center" }}>Go live at Main Canteen</Link>
      </div>
      <Nav />
    </div>
  );
}
