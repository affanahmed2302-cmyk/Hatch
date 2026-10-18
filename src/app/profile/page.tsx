"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, saveProfile } from "@/lib/supabase";
import { computeCareerScore, rankBreakdown } from "@/lib/profileRank";
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
  const [leetcode, setLeetcode] = useState("");
  const [phone, setPhone] = useState("");
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email || "");
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) {
        setFullName(p.full_name || "");
        setUsername(p.username || "");
        setBio(p.bio || "");
        setSkills(Array.isArray(p.skills) ? p.skills.join(", ") : p.skills || "");
        setGithub(p.github_url || p.github_handle || "");
        setLinkedin(p.linkedin_url || "");
        setLeetcode(p.leetcode_url || p.leetcode_handle || "");
        setPhone(p.phone || "");
        setYear(p.year != null ? String(p.year) : "");
        setBranch(p.branch || p.department || "");
        setAvatarUrl(p.avatar_url || "");
      }
      setLoading(false);
    })();
  }, [router]);

  const previewRank = computeCareerScore({
    github_url: github,
    linkedin_url: linkedin,
    leetcode_url: leetcode,
    phone,
    skills,
    bio,
    avatar_url: avatarUrl,
  });

  async function onSave() {
    if (!userId) return;
    setSaving(true);
    setErr("");
    setMsg("");
    const skillList = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await saveProfile(userId, {
      full_name: fullName,
      username,
      bio,
      skills: skillList,
      github_url: github.trim() || null,
      linkedin_url: linkedin.trim() || null,
      leetcode_url: leetcode.trim() || null,
      phone: phone.trim() || null,
      year,
      branch,
      department: branch,
      avatar_url: avatarUrl || null,
    });
    if (!res.ok) setErr((res as any).error || "Save failed");
    else setMsg(`Saved · career score +${previewRank} toward leaderboard`);
    setSaving(false);
  }

  async function onPhotoFile(file: File) {
    if (!userId) return;
    setPhotoBusy(true);
    setErr("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      setAvatarUrl(url);
      await saveProfile(userId, { avatar_url: url });
      setPhotoOpen(false);
      setMsg("Photo updated");
    } catch (e: any) {
      setErr(e?.message || "Upload failed — check Storage bucket avatars");
    }
    setPhotoBusy(false);
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
        <div className="logo" style={{ fontSize: 16 }}>
          Profile
        </div>
        <Link href="/leaderboard" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
          Leaderboard
        </Link>
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
              cursor: "pointer",
            }}
          />
          <p className="muted" style={{ fontSize: 12 }}>
            Tap photo to update
          </p>
        </div>

        <div className="card" style={{ border: "1px solid rgba(167,139,250,0.35)" }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Career score preview: {previewRank}</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Optional — GitHub, LinkedIn, LeetCode, phone boost rank. Not required to use Hatch.
          </p>
          <ul className="muted" style={{ fontSize: 11, marginTop: 8, paddingLeft: 16 }}>
            {rankBreakdown({
              github_url: github,
              linkedin_url: linkedin,
              leetcode_url: leetcode,
              phone,
              skills,
              bio,
              avatar_url: avatarUrl,
            }).map((r) => (
              <li key={r.label}>
                {r.label}: +{r.pts}
              </li>
            ))}
          </ul>
        </div>

        <div className="card stack">
          <label className="label">Name *</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          <label className="label">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
          <label className="label">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="About you" />
          <label className="label">Skills (comma separated)</label>
          <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Python, DSA" />
          <label className="label">Year</label>
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2" />
          <label className="label">Branch</label>
          <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE" />
        </div>

        <div className="card stack">
          <div style={{ fontWeight: 800, fontSize: 14 }}>Career links (optional)</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Not compulsory. Adding them raises your leaderboard score.
          </p>
          <label className="label">GitHub</label>
          <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/you" />
          <label className="label">LinkedIn</label>
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
          <label className="label">LeetCode</label>
          <input value={leetcode} onChange={(e) => setLeetcode(e.target.value)} placeholder="username or profile URL" />
          <label className="label">Phone (optional)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" inputMode="tel" />
          <p className="muted" style={{ fontSize: 11 }}>
            Phone counts for rank; not shown on public campus feed.
          </p>
        </div>

        <p className="muted" style={{ fontSize: 12 }}>
          {email}
        </p>
        <button type="button" className="btn" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        <div style={{ height: 88 }} />
      </div>
      <Nav />
      <PhotoSheet open={photoOpen} onClose={() => setPhotoOpen(false)} onFile={onPhotoFile} busy={photoBusy} />
    </div>
  );
}
