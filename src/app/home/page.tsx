"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, displayName, needsTermsAcceptance } from "@/lib/supabase";
import Nav from "@/components/Nav";

export default function Home() {
  const [notes, setNotes] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const router = useRouter();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    if (await needsTermsAcceptance(user.id)) { router.push("/terms"); return; }
    setMyId(user.id);
    const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    const { data } = await supabase.from("status_bubbles").select("*")
      .gte("created_at", since).order("created_at", { ascending: false }).limit(40);
    setNotes(data || []);
    const ids = [...new Set((data || []).map((n: any) => n.user_id))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, username").in("id", ids);
      const map: Record<string, any> = {};
      (ps || []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
  }

  useEffect(() => { load(); }, []);

  async function postNote() {
    if (!myId || !text.trim()) return;
    const { error } = await supabase.from("status_bubbles").insert({
      user_id: myId, content: text.trim().slice(0, 60),
    });
    if (!error) { setText(""); await load(); }
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">MESH</div></div>
      <div className="page fade">
        <div className="row" style={{ marginBottom: 4 }}><span className="pulse-dot" /><h1 className="h1" style={{ margin: 0 }}>Pulse</h1></div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Campus status · auto-clears in 6h</p>
        <div className="card stack" style={{ marginBottom: 14 }}>
          <input maxLength={60} placeholder="What's happening on campus?" value={text} onChange={e => setText(e.target.value)} />
          <button className="btn btn-sm" onClick={postNote} disabled={!text.trim()}>Post vibe</button>
        </div>
        {notes.map(n => (
          <div key={n.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName(profiles[n.user_id] || {})}</div>
            <div style={{ marginTop: 6 }}>{n.content}</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              {n.created_at ? new Date(n.created_at).toLocaleTimeString() : ""}
            </div>
          </div>
        ))}
        {notes.length === 0 && <div className="empty"><p>No live vibes · be the first</p></div>}
      </div>
      <Nav />
    </div>
  );
}
