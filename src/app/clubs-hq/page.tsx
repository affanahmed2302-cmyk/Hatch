"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import { SEED_CLUBS, bulkSeedClubs, createOneClub, countClubs } from "@/lib/clubsHq";
import { getMemberCounts } from "@/lib/clubs";
import Nav from "@/components/Nav";

/** Clubs HQ — onboard 60+ clubs (super-admin) */
export default function ClubsHqPage() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [clubs, setClubs] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Tech");
  const [desc, setDesc] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    const { data } = await supabase.from("clubs").select("*").order("name");
    setClubs(data || []);
    setTotal(await countClubs());
    if (data?.length) setCounts(await getMemberCounts(data.map((c: any) => c.id)));
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setEmail(user.email || "");
      setUserId(user.id);
      if (!isSuperAdmin(user.email)) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      await load();
      setLoading(false);
    })();
  }, [router]);

  async function seedAll() {
    if (!userId) return;
    setBusy(true); setErr("");
    const res = await bulkSeedClubs(email, userId);
    setBusy(false);
    if (!res.ok) setErr(res.error || "Failed");
    else {
      setMsg(`Seeded ${res.created} new clubs (skipped existing names)`);
      await load();
    }
  }

  async function addOne() {
    if (!userId) return;
    const res = await createOneClub(email, userId, { name, category, description: desc });
    if (!res.ok) setErr(res.error || "Failed");
    else {
      setMsg("Club created");
      setName(""); setDesc("");
      await load();
    }
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }

  if (!allowed) {
    return (
      <div className="shell">
        <div className="page">
          <div className="card">
            <div className="h2">Clubs HQ</div>
            <p className="muted" style={{ fontSize: 13 }}>Super-admin only. Students use /clubs to browse.</p>
            <Link href="/clubs" className="btn" style={{ marginTop: 12, display: "block", textAlign: "center" }}>Browse clubs</Link>
          </div>
        </div>
        <Nav />
      </div>
    );
  }

  const filtered = clubs.filter((c) =>
    !q || String(c.name).toLowerCase().includes(q.toLowerCase()) || String(c.category || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="shell">
      <div className="topbar" style={{ background: "linear-gradient(90deg,#0ea5e9,#6366f1)", border: "none" }}>
        <Link href="/pilot" className="btn-ghost btn-sm" style={{ color: "#fff" }}>Pilot</Link>
        <div style={{ fontWeight: 900, color: "#fff", fontSize: 14 }}>Clubs HQ</div>
        <span style={{ marginLeft: "auto", color: "#fff", fontSize: 12 }}>{total} clubs</span>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Bulk onboard ({SEED_CLUBS.length} templates)</div>
          <p className="muted" style={{ fontSize: 12 }}>
            One tap creates missing clubs from the BMSCE-style seed list (skips duplicates).
          </p>
          <button className="btn" onClick={seedAll} disabled={busy}>
            {busy ? "Seeding…" : `Seed up to ${SEED_CLUBS.length} clubs`}
          </button>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Add one club</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Club name" />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {["Tech", "Cultural", "Sports", "Social", "Academic", "Other"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" />
          <button className="btn btn-sm" onClick={addOne}>Create</button>
        </div>

        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clubs…" style={{ marginBottom: 12 }} />

        {filtered.map((c) => (
          <Link key={c.id} href={`/clubs/${c.id}`} className="card" style={{ display: "block", marginBottom: 8, textDecoration: "none", color: "inherit" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <span className="badge">{c.category}</span>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{counts[c.id] || 0} members</p>
          </Link>
        ))}

        <Link href="/clubs" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 12 }}>
          Student clubs browse →
        </Link>
      </div>
      <Nav />
    </div>
  );
}
