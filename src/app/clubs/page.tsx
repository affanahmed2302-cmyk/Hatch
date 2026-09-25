"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import { createClub, getMemberCounts } from "@/lib/clubs";
import Nav from "@/components/Nav";

const CATEGORIES = ["All", "Tech", "Cultural", "Sports", "Social", "Academic", "Other"];

export default function ClubsPage() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cat, setCat] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [superA, setSuperA] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Tech");
  const [desc, setDesc] = useState("");
  const [mention, setMention] = useState("");
  const router = useRouter();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setMyId(user.id);
    setEmail(user.email || null);
    setSuperA(isSuperAdmin(user.email));
    const { data, error } = await supabase.from("clubs").select("*").order("name");
    if (error) setErr("Clubs table missing — run SQL in Supabase");
    else setErr("");
    setClubs(data || []);
    if (data?.length) {
      const m = await getMemberCounts(data.map((c: any) => c.id));
      setCounts(m);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!myId || !name.trim()) return;
    const res = await createClub(email, myId, { name, category, description: desc, adminUsername: mention });
    if (!res.ok) { setErr(res.error || "Failed"); return; }
    setShowCreate(false); setName(""); setDesc(""); setMention("");
    setMsg(mention.trim() ? "Club created · admin invite sent" : "Club created");
    await load();
  }

  const filtered = cat === "All" ? clubs : clubs.filter(c => (c.category || "").toLowerCase() === cat.toLowerCase());
  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">HATCH</div>
        {superA && (
          <button className="btn btn-sm" onClick={() => setShowCreate(!showCreate)} style={{ marginLeft: "auto" }}>
            {showCreate ? "Close" : "+ Club"}
          </button>
        )}
      </div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 4 }}>BMSCE Clubs</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Official boards · only super-admin creates</p>
        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}

        {showCreate && superA && (
          <div className="card stack" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600 }}>New club</div>
            <input placeholder="Club name *" value={name} onChange={e => setName(e.target.value)} />
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
            </select>
            <textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
            <input placeholder="@username to invite as admin" value={mention} onChange={e => setMention(e.target.value)} />
            <button className="btn" onClick={handleCreate} disabled={!name.trim()}>Create club</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }}>
          {CATEGORIES.map(c => (
            <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>

        {filtered.map(c => (
          <Link key={c.id} href={`/clubs/${c.id}`} className="card" style={{ display: "block", marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="h2">{c.name}</div>
              <span className="badge">{c.category || "Club"}</span>
            </div>
            {c.description && <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>{c.description}</p>}
            <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
              {counts[c.id] || 0} member{(counts[c.id] || 0) === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
        {filtered.length === 0 && !err && <div className="empty"><p>No clubs yet</p></div>}
      </div>
      <Nav />
    </div>
  );
}
