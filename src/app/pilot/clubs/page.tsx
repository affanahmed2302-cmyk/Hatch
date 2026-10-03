"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin, displayName } from "@/lib/supabase";
import {
  createClub, listClubs, addClubAdmin, listClubAdmins, searchUsers, grantBadge,
} from "@/lib/clubBoard";

export default function PilotClubsPage() {
  const [email, setEmail] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("technical");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<any[]>([]);
  const [picked, setPicked] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [admins, setAdmins] = useState<any[]>([]);
  const [badgeUser, setBadgeUser] = useState("");
  const [badgeName, setBadgeName] = useState("Captain");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh() {
    setClubs(await listClubs());
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isSuperAdmin(user.email)) { router.replace("/home"); return; }
      setEmail(user.email || "");
      setAdminId(user.id);
      await refresh();
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!selectedClub) { setAdmins([]); return; }
    listClubAdmins(selectedClub).then(setAdmins);
  }, [selectedClub]);

  async function onSearch() {
    setFound(await searchUsers(q));
  }

  async function onCreate() {
    if (!adminId) return;
    const res = await createClub(email, adminId, {
      name,
      description: desc,
      category: cat,
      adminUserIds: picked.map((p) => p.id),
    });
    if (!res.ok) setMsg(res.error || "Failed — run hatch_club_pro.sql");
    else {
      setMsg("Club created: " + name);
      setName(""); setDesc(""); setPicked([]);
      await refresh();
    }
  }

  async function onAddAdmin(uid: string) {
    if (!selectedClub) return;
    const res = await addClubAdmin(email, selectedClub, uid);
    setMsg(res.ok ? "Admin added" : res.error || "Failed");
    setAdmins(await listClubAdmins(selectedClub));
  }

  async function onBadge() {
    if (!adminId || !badgeUser) return;
    const res = await grantBadge(email, adminId, badgeUser, badgeName, "Early marketer");
    setMsg(res.ok ? "Badge granted" : res.error || "Failed");
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#050508" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#0ea5e9,#7c3aed)", border: "none" }}>
        <Link href="/pilot" className="btn-ghost btn-sm" style={{ color: "#fff" }}>← Pilot</Link>
        <div style={{ fontWeight: 900, color: "#fff", fontSize: 14 }}>Clubs · Badges</div>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Create club (only you)</div>
          <p className="muted" style={{ fontSize: 12 }}>Students cannot create clubs. Assign 1–2 club people as admins.</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Club name e.g. Coding Club" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" rows={2} />
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="technical">Technical</option>
            <option value="cultural">Cultural</option>
            <option value="sports">Sports</option>
            <option value="literary">Literary</option>
            <option value="other">Other</option>
          </select>

          <div className="h2" style={{ fontSize: 13 }}>Search users to make club admin</div>
          <div className="row" style={{ gap: 8 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name / username / email" style={{ flex: 1 }} />
            <button className="btn-ghost btn-sm" onClick={onSearch}>Search</button>
          </div>
          {found.map((u) => (
            <button
              key={u.id}
              className="btn-ghost btn-sm"
              style={{ textAlign: "left" }}
              onClick={() => {
                if (!picked.find((p) => p.id === u.id)) setPicked([...picked, u].slice(0, 2));
              }}
            >
              + {displayName(u)} {u.email ? `· ${u.email}` : ""}
            </button>
          ))}
          {picked.length > 0 && (
            <p className="muted" style={{ fontSize: 12 }}>
              Admins: {picked.map((p) => displayName(p)).join(", ")}
              {" "}
              <button className="btn-ghost btn-sm" onClick={() => setPicked([])}>Clear</button>
            </p>
          )}
          <button className="btn" onClick={onCreate}>Create club</button>
        </div>

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Manage admins on existing club</div>
          <select value={selectedClub} onChange={(e) => setSelectedClub(e.target.value)}>
            <option value="">Select club…</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {admins.map((a) => (
            <p key={a.id} style={{ fontSize: 13 }}>{displayName(a)} · {a.role}</p>
          ))}
          {selectedClub && found.map((u) => (
            <button key={u.id} className="btn-ghost btn-sm" onClick={() => onAddAdmin(u.id)}>
              Add {displayName(u)} as admin
            </button>
          ))}
        </div>

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Grant Captain / marketer badge</div>
          <p className="muted" style={{ fontSize: 12 }}>Shows on their profile as early growth partner</p>
          <input value={badgeUser} onChange={(e) => setBadgeUser(e.target.value)} placeholder="User UUID (from search — copy id later)" />
          <select value={badgeName} onChange={(e) => setBadgeName(e.target.value)}>
            <option value="Captain">Captain</option>
            <option value="Core">Core</option>
            <option value="Spark">Spark</option>
            <option value="Legend">Legend</option>
          </select>
          {found.map((u) => (
            <button key={u.id} className="btn-ghost btn-sm" onClick={() => setBadgeUser(u.id)}>
              Use {displayName(u)}
            </button>
          ))}
          <button className="btn" onClick={onBadge}>Grant badge</button>
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>All clubs ({clubs.length})</div>
          {clubs.map((c) => (
            <Link key={c.id} href={`/club/${c.id}`} style={{ display: "block", padding: "8px 0", borderTop: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}>
              <strong>{c.name}</strong>
              <p className="muted" style={{ fontSize: 11 }}>{c.category} · {c.description}</p>
            </Link>
          ))}
          {!clubs.length && <p className="muted" style={{ fontSize: 12 }}>None yet — run hatch_club_pro.sql</p>}
        </div>
      </div>
    </div>
  );
}
