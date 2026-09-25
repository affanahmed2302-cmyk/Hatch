"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, saveProfile } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Link from "next/link";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setBio(data.bio || "");
        setDepartment(data.department || "");
        setYear(data.year != null ? String(data.year) : "");
      }
      setLoading(false);
    })();
  }, [router]);

  async function save() {
    if (!userId) return;
    setSaving(true); setErr(""); setMsg("");
    const res = await saveProfile(userId, {
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim() || null,
      department: department.trim() || null,
      year: year || null,
    });
    setSaving(false);
    if (!res.ok) setErr(res.error || "Save failed");
    else setMsg("Saved");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
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
      <div className="topbar">
        <div className="logo">HATCH</div>
        <Link href="/settings" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>Settings</Link>
      </div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 12 }}>Your profile</h1>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
        <div className="card stack">
          <div>
            <span className="label">Display name *</span>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Real name" />
          </div>
          <div>
            <span className="label">Username * (unique)</span>
            <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="like_instagram" />
          </div>
          <div>
            <span className="label">Bio / interests</span>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="What you build, hobbies, skills…" />
          </div>
          <div>
            <span className="label">Department</span>
            <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="CSE / ISE / ECE…" />
          </div>
          <div>
            <span className="label">Year</span>
            <select value={year} onChange={e => setYear(e.target.value)}>
              <option value="">—</option>
              <option value="1">1st</option>
              <option value="2">2nd</option>
              <option value="3">3rd</option>
              <option value="4">4th</option>
            </select>
          </div>
          <button className="btn" onClick={save} disabled={saving || !fullName.trim() || username.length < 3}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
        <button className="btn-ghost" style={{ width: "100%", marginTop: 16 }} onClick={logout}>Log out</button>
      </div>
      <Nav />
    </div>
  );
}
