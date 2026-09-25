"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import { createPost, deletePost, joinClub, leaveClub, isMember, getMemberCounts } from "@/lib/clubs";
import Nav from "@/components/Nav";

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [club, setClub] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState(0);
  const [joined, setJoined] = useState(false);
  const [superA, setSuperA] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setMyId(user.id);
    setSuperA(isSuperAdmin(user.email));
    const { data: c } = await supabase.from("clubs").select("*").eq("id", id).maybeSingle();
    setClub(c);
    const { data: ps } = await supabase.from("club_posts").select("*").eq("club_id", id).order("created_at", { ascending: false });
    setPosts(ps || []);
    const counts = await getMemberCounts([id]);
    setMembers(counts[id] || 0);
    setJoined(await isMember(id, user.id));
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function publish() {
    if (!myId || !title.trim()) return;
    const res = await createPost(id, myId, title, body);
    if (!res.ok) setErr(res.error || "Failed");
    else { setTitle(""); setBody(""); setMsg("Posted"); await load(); }
  }

  async function toggleJoin() {
    if (!myId) return;
    if (joined) await leaveClub(id, myId);
    else await joinClub(id, myId);
    await load();
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="shell" style={{ padding: 24 }}>
        <p className="muted">Club not found</p>
        <Link href="/clubs" className="btn" style={{ marginTop: 12, display: "inline-block" }}>Back</Link>
      </div>
    );
  }

  const canPost = superA || club.club_admin_id === myId;

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/clubs" className="btn-ghost btn-sm">← Clubs</Link>
        <div className="logo" style={{ marginLeft: 8 }}>HATCH</div>
      </div>
      <div className="page">
        <h1 className="h1">{club.name}</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{club.category} · {members} members</p>
        {club.description && <p style={{ marginBottom: 12 }}>{club.description}</p>}
        <button className="btn-ghost btn-sm" onClick={toggleJoin} style={{ marginBottom: 14 }}>
          {joined ? "Leave club" : "Join club"}
        </button>
        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}

        {canPost && (
          <div className="card stack" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600 }}>Publish notice</div>
            <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea placeholder="Body" value={body} onChange={e => setBody(e.target.value)} rows={3} />
            <button className="btn btn-sm" onClick={publish} disabled={!title.trim()}>Publish</button>
          </div>
        )}

        {posts.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <div className="h2">{p.title}</div>
            <p style={{ fontSize: 14, marginTop: 6, whiteSpace: "pre-wrap" }}>{p.body}</p>
            {canPost && (
              <button className="btn-danger" style={{ marginTop: 8 }} onClick={async () => { await deletePost(p.id); await load(); }}>
                Delete
              </button>
            )}
          </div>
        ))}
        {posts.length === 0 && <div className="empty"><p>No posts yet</p></div>}
      </div>
      <Nav />
    </div>
  );
}
