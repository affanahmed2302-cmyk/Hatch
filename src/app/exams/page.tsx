"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { sanitizePlain } from "@/lib/sanitize";
import Nav from "@/components/Nav";

type Exam = { id: string; title: string; date: string };

export default function ExamsPage() {
  const [items, setItems] = useState<Exam[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      try {
        const raw = localStorage.getItem("hatch_exams_" + user.id);
        if (raw) setItems(JSON.parse(raw));
      } catch { /* */ }
    })();
  }, [router]);

  async function add() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const t = sanitizePlain(title, 80);
    if (!t || !date) return;
    const next = [{ id: String(Date.now()), title: t, date }, ...items].slice(0, 20);
    setItems(next);
    localStorage.setItem("hatch_exams_" + user.id, JSON.stringify(next));
    setTitle("");
  }

  function daysLeft(d: string) {
    const ms = new Date(d).getTime() - Date.now();
    return Math.ceil(ms / 86400000);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/tools" className="btn-ghost btn-sm">← Tools</Link>
        <div className="logo" style={{ fontSize: 15 }}>Exam Countdown</div>
      </div>
      <div className="page">
        <div className="card" style={{ marginBottom: 12 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Subject / exam name" maxLength={80} style={{ marginBottom: 8 }} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginBottom: 8 }} />
          <button className="btn" style={{ width: "100%" }} onClick={add}>Add</button>
        </div>
        {items.map((e) => {
          const d = daysLeft(e.date);
          return (
            <div key={e.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 800 }}>{e.title}</div>
              <p className="muted" style={{ fontSize: 13 }}>{e.date} · {d >= 0 ? `${d} days left` : "passed"}</p>
            </div>
          );
        })}
        {!items.length && <div className="empty"><p>Add your next internal / semester exam</p></div>}
        <Link href="/schedule" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 12 }}>Open Schedule</Link>
      </div>
      <Nav />
    </div>
  );
}
