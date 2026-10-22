"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatWindowLabel } from "@/lib/features";
import Nav from "@/components/Nav";

type Item = { id: string; content: string; created_at: string };

export default function ConfessionsPage() {
  const [open, setOpen] = useState(false);
  const [windowLabel, setWindowLabel] = useState("10pm–5am IST");
  const [text, setText] = useState("");
  const [list, setList] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function load() {
    const headers = await authHeader();
    if (!headers) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("/api/confessions", { headers });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || "Failed to load");
        return;
      }
      setList(json.items || []);
      setOpen(!!json.open);
      if (json.window) setWindowLabel(formatWindowLabel(json.window.start, json.window.end));
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "Network error");
    }
  }

  useEffect(() => {
    load();
  }, [router]);

  async function post() {
    if (!text.trim()) return;
    setLoading(true);
    setErr("");
    setMsg("");
    const headers = await authHeader();
    if (!headers) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("/api/confessions", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      const json = await res.json();
      if (!res.ok) setErr(json.error || "Could not post");
      else {
        setText("");
        setMsg("Posted anonymously");
        await load();
      }
    } catch (e: any) {
      setErr(e?.message || "Network error");
    }
    setLoading(false);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">CONFESSIONS</div>
        <Link href="/more" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
          More
        </Link>
      </div>
      <div className="page stack">
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Anonymous campus posts during {windowLabel}. Authors are not shown to other students. Not perfectly anonymous to moderators with database access.
        </p>
        {!open && (
          <div className="fail">Window closed ({windowLabel}). You can still read recent posts.</div>
        )}
        {open && (
          <div className="card stack">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Say something honest — no names, no harassment"
              aria-label="Confession text"
            />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {text.length}/280
              </span>
              <button type="button" className="btn btn-sm" disabled={!text.trim() || loading} onClick={post}>
                {loading ? "Posting…" : "Post anonymously"}
              </button>
            </div>
          </div>
        )}
        {msg && <div className="ok">{msg}</div>}
        {err && <div className="fail">{err}</div>}
        <div className="section-label">Recent</div>
        {list.length === 0 && <div className="empty">No confessions yet</div>}
        {list.map((c) => (
          <div key={c.id} className="card">
            <p style={{ fontSize: 14, lineHeight: 1.45 }}>{c.content}</p>
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              {new Date(c.created_at).toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>
      <Nav />
    </div>
  );
}
