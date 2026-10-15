"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import { sanitizePlain } from "@/lib/sanitize";
import Nav from "@/components/Nav";

type Item = { id: string; kind: string; title: string; place?: string; note?: string; author_id?: string; created_at?: string; profile?: any };

export default function LostFoundPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [kind, setKind] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("Library");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    try {
      const { data } = await supabase
        .from("lost_found")
        .select("id, kind, title, place, note, author_id, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      setItems((data as Item[]) || []);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      await load();
    })();
  }, [router]);

  async function post() {
    if (!myId) return;
    const t = sanitizePlain(title, 80);
    if (!t) { setMsg("What did you lose/find?"); return; }
    try {
      const { error } = await supabase.from("lost_found").insert({
        kind,
        title: t,
        place: sanitizePlain(place, 40),
        note: sanitizePlain(note, 160),
        author_id: myId,
      });
      if (error) {
        setMsg("Local only — run lost_found SQL for shared board");
        setItems((prev) => [{ id: String(Date.now()), kind, title: t, place, note, author_id: myId }, ...prev]);
      } else {
        setMsg("Posted");
        setTitle("");
        setNote("");
        await load();
      }
    } catch {
      setMsg("Failed");
    }
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/tools" className="btn-ghost btn-sm">← Tools</Link>
        <div className="logo" style={{ fontSize: 15 }}>Lost & Found</div>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <button type="button" className={kind === "lost" ? "chip on" : "chip"} onClick={() => setKind("lost")}>Lost</button>
            <button type="button" className={kind === "found" ? "chip on" : "chip"} onClick={() => setKind("found")}>Found</button>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ID card / bottle / keys…" maxLength={80} style={{ marginBottom: 8 }} />
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Place" maxLength={40} style={{ marginBottom: 8 }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" maxLength={160} style={{ marginBottom: 8 }} />
          <button className="btn" style={{ width: "100%" }} onClick={post}>Post</button>
        </div>
        {items.map((it) => (
          <div key={it.id} className="card" style={{ marginBottom: 8 }}>
            <span className="badge">{it.kind}</span>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{it.title}</div>
            <p className="muted" style={{ fontSize: 12 }}>{it.place}{it.note ? ` · ${it.note}` : ""}</p>
            {it.author_id && it.author_id !== myId && (
              <Link href={"/chat/" + it.author_id} className="btn btn-sm" style={{ marginTop: 8 }}>Message</Link>
            )}
          </div>
        ))}
        {!items.length && <div className="empty"><p>No posts yet</p></div>}
      </div>
      <Nav />
    </div>
  );
}
