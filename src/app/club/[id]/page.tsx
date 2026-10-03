"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import {
  fetchClubPosts, reactToPost, reactionCounts, isClubAdmin, createClubPost, EMOJI_SET,
} from "@/lib/clubBoard";
import Nav from "@/components/Nav";

export default function ClubBoardPage() {
  const { id } = useParams<{ id: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [club, setClub] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({{}});
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [ptype, setPtype] = useState("notice");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load(uid: string) {
    const { data: c } = await supabase.from("campus_clubs").select("*").eq("id", id).maybeSingle();
    setClub(c);
    const p = await fetchClubPosts(id);
    setPosts(p);
    const map: Record<string, Record<string, number>> = {};
    for (const post of p) map[post.id] = await reactionCounts(post.id);
    setCounts(map);
    setIsAdmin(isSuperAdmin((await supabase.auth.getUser()).data.user?.email) || (await isClubAdmin(uid, id)));
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      await load(user.id);
      setLoading(false);
    })();
  }, [id, router]);

  async function onReact(postId: string, emoji: string) {
    if (!userId) return;
    await reactToPost(userId, postId, emoji);
    setCounts((prev) => ({
      ...prev,
      [postId]: { ...(prev[postId] || {}), [emoji]: ((prev[postId] || {})[emoji] || 0) + 1 },
    }));
  }

  async function onPost() {
    if (!userId) return;
    const res = await createClubPost(userId, id, {
      post_type: ptype,
      title,
      body,
      link_url: link,
    }, isSuperAdmin(email));
    if (!res.ok) setMsg(res.error || "Failed");
    else {
      setMsg("Posted");
      setTitle(""); setBody(""); setLink("");
      await load(userId);
    }
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }
  if (!club) {
    return (
      <div className="shell">
        <div className="page"><p className="muted">Club not found — run hatch_club_pro.sql</p><Link href="/clubs">Back</Link></div>
        <Nav />
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/clubs" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 14 }}>{club.name}</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{club.description}</p>
        <p className="muted" style={{ fontSize: 11, marginBottom: 12 }}>
          Professional board · emoji reactions only · no public chat
        </p>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        {isAdmin && (
          <div className="card stack" style={{ marginBottom: 14, border: "1px solid rgba(14,165,233,0.4)" }}>
            <div className="h2">Admin post</div>
            <select value={ptype} onChange={(e) => setPtype(e.target.value)}>
              <option value="notice">Notice</option>
              <option value="link">Link</option>
              <option value="photo">Photo / media URL</option>
              <option value="poll">Poll (body = options line by line)</option>
              <option value="video">Video link</option>
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body / caption" rows={3} />
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link or media URL (optional)" />
            <button className="btn" onClick={onPost}>Publish to club</button>
          </div>
        )}

        {posts.map((p) => (
          <div key={p.id} className="card" style={{ marginBottom: 12 }}>
            <span className="badge">{p.post_type}</span>
            {p.title && <div style={{ fontWeight: 800, marginTop: 6 }}>{p.title}</div>}
            {p.body && <p style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>{p.body}</p>}
            {p.link_url && (
              <a href={p.link_url} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
                Open link →
              </a>
            )}
            <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {EMOJI_SET.map((e) => (
                <button
                  key={e}
                  className="btn-ghost btn-sm"
                  onClick={() => onReact(p.id, e)}
                  style={{ fontSize: 14 }}
                >
                  {e} {(counts[p.id] || {})[e] || ""}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!posts.length && <p className="muted">No posts yet — club admin will publish notices here.</p>}
      </div>
      <Nav />
    </div>
  );
}
