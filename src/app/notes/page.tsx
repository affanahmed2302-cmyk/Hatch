"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { sanitizePlain, sanitizeUrl } from "@/lib/sanitize";
import Nav from "@/components/Nav";

type Note = { id: string; title: string; url?: string; subject?: string };

export default function NotesPage() {
  const [rows, setRows] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      try {
        const { data } = await supabase.from("peer_notes").select("id, title, url, subject").order("created_at", { ascending: false }).limit(40);
        if (data) setRows(data as Note[]);
      } catch { /* optional table */ }
    })();
  }, [router]);

  async function post() {
    const t = sanitizePlain(title, 100);
    const u = sanitizeUrl(url);
    if (!t) { setMsg("Title required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { error } = await supabase.from("peer_notes").insert({
        title: t, url: u, subject: sanitizePlain(subject, 40), author_id: user.id,
      });
      if (error) {
        setRows((prev) => [{ id: String(Date.now()), title: t, url: u || undefined, subject }, ...prev]);
        setMsg("Saved on device — SQL enables campus share");
      } else {
        setMsg("Shared");
        setTitle(""); setUrl(""); setSubject("");
        const { data } = await supabase.from("peer_notes").select("id, title, url, subject").order("created_at", { ascending: false }).limit(40);
        if (data) setRows(data as Note[]);
      }
    } catch { setMsg("Failed"); }
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/tools" className="btn-ghost btn-sm">← Tools</Link>
        <div className="logo" style={{ fontSize: 15 }}>Peer Notes</div>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        <div className="card" style={{ marginBottom: 12 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notes title" maxLength={100} style={{ marginBottom: 8 }} />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" maxLength={40} style={{ marginBottom: 8 }} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https:// drive / notion link" maxLength={300} style={{ marginBottom: 8 }} />
          <button className="btn" style={{ width: "100%" }} onClick={post}>Share link</button>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 800 }}>{r.title}</div>
            {r.subject && <p className="muted" style={{ fontSize: 12 }}>{r.subject}</p>}
            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ marginTop: 8, display: "inline-block" }}>Open</a>}
          </div>
        ))}
        {!rows.length && <div className="empty"><p>Share Drive / Notion links with classmates</p></div>}
      </div>
      <Nav />
    </div>
  );
}
