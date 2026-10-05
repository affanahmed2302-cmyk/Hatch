"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, saveProfile, isSuperAdmin } from "@/lib/supabase";
import { generateGoalPlan, downloadIcs, saveGoal } from "@/lib/coach";
import Nav from "@/components/Nav";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) {
        setFullName(p.full_name || "");
        setUsername(p.username || "");
        setBio(p.bio || "");
        setSkills(Array.isArray(p.skills) ? p.skills.join(", ") : (p.skills || ""));
        setGithub(p.github_url || "");
        setLinkedin(p.linkedin_url || "");
        setYear(p.year || "");
        setBranch(p.branch || "");
        setAvatarUrl(p.avatar_url || "");
      }
      setLoading(false);
    })();
  }, [router]);

  async function onSave() {
    if (!userId) return;
    setSaving(true); setErr(""); setMsg("");
    const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await saveProfile(userId, {
      full_name: fullName,
      username,
      bio,
      skills: skillList,
      github_url: github,
      linkedin_url: linkedin,
      year,
      branch,
      avatar_url: avatarUrl,
    });
    if (!res.ok) setErr(res.error || "Save failed");
    else setMsg("Profile saved");
    setSaving(false);
  }

  async function uploadAvatar(file: File) {
    if (!userId || !file) return;
    setUploading(true); setErr("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl + "?t=" + Date.now();
      setAvatarUrl(url);
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      setMsg("Photo updated");
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    }
    setUploading(false);
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
        <div className="logo" style={{ fontSize: 16 }}>Profile</div>
        <button className="btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setSheet(true)}>···</button>
      </div>
      <div className="page stack">
        {msg && <div className="ok">{msg}</div>}
        {err && <div className="fail">{err}</div>}

        <div className="card stack" style={{ alignItems: "center", textAlign: "center" }}>
          <div
            style={{
              width: 96, height: 96, borderRadius: "50%",
              background: avatarUrl ? `url(${avatarUrl}) center/cover` : "var(--grad-cool)",
              border: "2px solid rgba(139,92,246,0.4)",
            }}
          />
          <button className="btn-ghost btn-sm" disabled={uploading} onClick={() => galleryRef.current?.click()}>
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn-ghost btn-sm" onClick={() => galleryRef.current?.click()}>Gallery</button>
            <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Files</button>
            <button className="btn-ghost btn-sm" onClick={() => cameraRef.current?.click()}>Camera</button>
          </div>
        </div>

        <div className="card stack">
          <label className="label">Name *</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          <label className="label">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
          <label className="label">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="About you" />
          <label className="label">Skills (comma separated)</label>
          <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Python, Design" />
          <label className="label">Year</label>
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2nd year" />
          <label className="label">Branch</label>
          <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE" />
          <label className="label">GitHub</label>
          <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." />
          <label className="label">LinkedIn</label>
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
          <p className="muted" style={{ fontSize: 11 }}>Email (locked): {email}</p>
          <button className="btn" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
        </div>

        <Link href="/challenges" className="btn-ghost" style={{ display: "block", textAlign: "center" }}>
          Campus Challenges
        </Link>
        <Link href="/settings" className="btn-ghost" style={{ display: "block", textAlign: "center" }}>
          Settings
        </Link>
      </div>

      {sheet && (
        <div className="modal-bg" onClick={() => setSheet(false)}>
          <div className="modal stack" onClick={(e) => e.stopPropagation()}>
            <div className="h2">More</div>
            <Link href="/challenges" className="btn-ghost" style={{ display: "block", textAlign: "center" }} onClick={() => setSheet(false)}>
              Campus Challenges
            </Link>
            <Link href="/explore" className="btn-ghost" style={{ display: "block", textAlign: "center" }} onClick={() => setSheet(false)}>
              Explore all features
            </Link>
            <Link href="/settings" className="btn-ghost" style={{ display: "block", textAlign: "center" }} onClick={() => setSheet(false)}>
              Settings
            </Link>
            <button className="btn-ghost" onClick={() => setSheet(false)}>Close</button>
          </div>
        </div>
      )}

      <Nav />
    </div>
  );
}
