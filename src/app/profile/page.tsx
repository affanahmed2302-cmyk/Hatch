"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, saveProfile } from "@/lib/supabase";
import { uploadUserAvatar } from "@/lib/uploadAvatar";
import PhotoSheet from "@/components/PhotoSheet";
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
  const [photoOpen, setPhotoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  async function onPhoto(file: File) {
    if (!userId) return;
    setUploading(true); setErr(""); setMsg("");
    const res = await uploadUserAvatar(userId, file);
    setUploading(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setAvatarUrl(res.url);
    setMsg("Photo updated");
    setPhotoOpen(false);
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
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label="Change profile photo"
            style={{
              width: 104,
              height: 104,
              borderRadius: "50%",
              border: "2px solid rgba(139,92,246,0.45)",
              background: avatarUrl ? `url(${avatarUrl}) center/cover` : "var(--grad-cool)",
              position: "relative",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                position: "absolute",
                right: 2,
                bottom: 2,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.7)",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✎
            </span>
          </button>
          <p className="muted" style={{ fontSize: 12 }}>Tap photo to update</p>
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

      <PhotoSheet open={photoOpen} onClose={() => setPhotoOpen(false)} onFile={onPhoto} busy={uploading} />

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
