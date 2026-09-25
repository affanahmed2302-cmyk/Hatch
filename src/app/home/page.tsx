"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, needsTermsAcceptance, postPulse, fetchPulseFeed } from "@/lib/supabase";
import Nav from "@/components/Nav";

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load(uid: string) {
    if (await needsTermsAcceptance(uid)) { router.replace("/terms"); return; }
    const res = await fetchPulseFeed();
    setPosts(res.data || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      await load(user.id);
    })();
  }, [router]);

  async function publish() {
    if (!myId || !text.trim()) return;
    setErr(""); setMsg("");
    const res = await postPulse(myId, text, "campus", true);
    if (!res.ok) { setErr(res.error || "Failed"); return; }
    setText("");
    setMsg("Posted anonymously");
    await load(myId);
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 4 }}>Pulse</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Anonymous campus notes · expire in 6h</p>
        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}
        <div className="card stack" style={{ marginBottom: 14 }}>
          <textarea placeholder="What's happening on campus? (anonymous)" value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={280} />
          <button className="btn btn-sm" onClick={publish} disabled={!text.trim()}>Post pulse</button>
        </div>
        {posts.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <span className="badge">{p.is_anonymous ? "Anonymous" : "Named"}</span>
              <span className="muted" style={{ fontSize: 11 }}>{p.category}</span>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.45 }}>{p.content}</p>
          </div>
        ))}
        {posts.length === 0 && <div className="empty"><p>No pulse yet — be the first</p></div>}
      </div>
      <Nav />
    </div>
  );
}
