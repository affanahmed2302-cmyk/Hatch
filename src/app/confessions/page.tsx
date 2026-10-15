"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isConfessionOpenNow, getConfessionWindow } from "@/lib/features";
import Nav from "@/components/Nav";

/** Anonymous night notes — college-safe (not marketed as dating). Window 10pm–5am. */
export default function NightNotesPage() {
  const [open, setOpen] = useState(false);
  const [windowLabel, setWindowLabel] = useState("10pm–5am");
  const [text, setText] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    try {
      const { data } = await supabase
        .from("confessions")
        .select("id, content, created_at")
        .order("created_at", { ascending: false })
        .limit(40);
      setList(data || []);
    } catch {
      setList([]);
    }
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUid(user.id);
      setOpen(await isConfessionOpenNow());
      const w = await getConfessionWindow();
      setWindowLabel(`${w.start}:00–${w.end}:00`);
      await load();
    })();
  }, [router]);

  async function post() {
    if (!uid || !text.trim()) return;
    if (!open) {
      setErr("Night notes open 10pm–5am only");
      return;
    }
    const { error } = await supabase.from("confessions").insert({
      author_id: uid,
      content: text.trim().slice(0, 280),
      is_anonymous: true,
    });
    if (error) {
      setErr(
        error.message.includes("relation")
          ? "Run sql/confessions.sql in Supabase"
          : error.message
      );
      return;
    }
    setText("");
    setMsg("Posted anonymously");
    await load();
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">
          ←
        </Link>
        <div className="logo" style={{ fontSize: 16 }}>
          Night notes
        </div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.45 }}>
          Anonymous campus notes · open{" "}
          <strong style={{ color: "#e9d5ff" }}>{windowLabel}</strong> local time. Be kind.
        </p>
        {msg && (
          <div className="ok" style={{ marginBottom: 10 }}>
            {msg}
          </div>
        )}
        {err && (
          <div className="fail" style={{ marginBottom: 10 }}>
            {err}
          </div>
        )}
        {!open && (
          <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(251,191,36,0.3)" }}>
            <div style={{ fontWeight: 700 }}>Closed right now</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Come back between 10pm and 5am.
            </p>
          </div>
        )}
        {open && (
          <div className="card stack" style={{ marginBottom: 12 }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share something for campus…"
              maxLength={280}
              rows={3}
            />
            <button className="btn btn-sm" onClick={post} disabled={!text.trim()}>
              Post anonymously
            </button>
          </div>
        )}
        {list.map((c) => (
          <div key={c.id} className="card" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 14, lineHeight: 1.45 }}>{c.content}</p>
            <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              Anonymous
            </p>
          </div>
        ))}
        {list.length === 0 && (
          <p className="muted" style={{ textAlign: "center", marginTop: 24 }}>
            No notes yet tonight
          </p>
        )}
      </div>
      <Nav />
    </div>
  );
}
