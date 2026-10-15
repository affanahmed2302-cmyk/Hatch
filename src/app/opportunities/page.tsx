"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { sanitizePlain, sanitizeUrl } from "@/lib/sanitize";
import Nav from "@/components/Nav";

type Opp = {
  id: string;
  title: string;
  company?: string;
  link?: string;
  tags?: string[];
  source?: string;
  created_at?: string;
};

/** Curated seed for BMSCE — AI backend can append rows to opportunities table later */
const SEED: Opp[] = [
  { id: "s1", title: "SDE Intern — product startups (Bangalore)", company: "Various", link: "https://internshala.com/internships/internship-in-bangalore/", tags: ["SDE", "Bangalore"], source: "curated" },
  { id: "s2", title: "Research intern — AI / ML labs", company: "IISc / startups", link: "https://www.linkedin.com/jobs/", tags: ["AI", "Research"], source: "curated" },
  { id: "s3", title: "Open source — first PR guide", company: "GitHub", link: "https://github.com/explore", tags: ["OSS", "GitHub"], source: "curated" },
  { id: "s4", title: "Hackathons near you", company: "Devfolio", link: "https://devfolio.co/hackathons", tags: ["Hackathon"], source: "curated" },
  { id: "s5", title: "BMSCE placement cell updates", company: "BMSCE", link: "https://bmsce.ac.in/", tags: ["Placement"], source: "campus" },
];

export default function OpportunitiesPage() {
  const [rows, setRows] = useState<Opp[]>(SEED);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      try {
        const { data } = await supabase
          .from("opportunities")
          .select("id, title, company, link, tags, source, created_at")
          .order("created_at", { ascending: false })
          .limit(40);
        if (data && data.length) setRows(data as Opp[]);
      } catch { /* table may not exist yet — seed is fine */ }
      setLoading(false);
    })();
  }, [router]);

  async function submit() {
    const t = sanitizePlain(title, 120);
    const u = sanitizeUrl(link);
    if (!t) { setMsg("Title required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { error } = await supabase.from("opportunities").insert({
        title: t,
        link: u,
        source: "student",
        posted_by: user.id,
        tags: [],
      });
      if (error) {
        setMsg("Saved locally — run opportunities SQL for shared feed");
        setRows((prev) => [{ id: "local-" + Date.now(), title: t, link: u || undefined, source: "you", tags: [] }, ...prev]);
      } else {
        setMsg("Posted for campus");
        setTitle("");
        setLink("");
        const { data } = await supabase.from("opportunities").select("id, title, company, link, tags, source, created_at").order("created_at", { ascending: false }).limit(40);
        if (data) setRows(data as Opp[]);
      }
    } catch {
      setMsg("Could not post");
    }
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/tools" className="btn-ghost btn-sm">← Tools</Link>
        <div className="logo" style={{ fontSize: 15 }}>Opportunities</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Internships, OSS, hackathons — share links. AI feed can auto-append when connected.
        </p>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Share an opportunity</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={120} style={{ marginBottom: 8 }} />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" maxLength={300} style={{ marginBottom: 8 }} />
          <button className="btn" style={{ width: "100%" }} onClick={submit}>Post</button>
        </div>

        {rows.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{r.title}</div>
            {r.company && <p className="muted" style={{ fontSize: 12 }}>{r.company}</p>}
            <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {(r.tags || []).map((t) => (
                <span key={t} className="badge">{t}</span>
              ))}
              {r.source && <span className="badge">{r.source}</span>}
            </div>
            {r.link && (
              <a href={r.link} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ marginTop: 10, display: "inline-block" }}>
                Open link
              </a>
            )}
          </div>
        ))}
      </div>
      <Nav />
    </div>
  );
}
