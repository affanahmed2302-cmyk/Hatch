"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, saveProfile } from "@/lib/supabase";

export default function OnboardingPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data?.terms_accepted === false || data?.terms_accepted == null) {
        router.replace("/terms");
        return;
      }
      if (data?.full_name && data?.bio && data?.avatar_url && data?.username) {
        router.replace("/home");
        return;
      }
      if (data?.full_name) setFullName(data.full_name);
      if (data?.username) setUsername(data.username);
      if (data?.bio) setBio(data.bio);
      if (data?.avatar_url) setPreview(data.avatar_url);
      setLoading(false);
    })();
  }, [router]);

  function onPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Upload an image file"); return; }
    if (f.size > 5 * 1024 * 1024) { setErr("Max 5MB photo"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setErr("");
  }

  async function submit() {
    if (!userId) return;
    setErr("");
    const name = fullName.trim();
    const uname = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const b = bio.trim();
    if (name.length < 2) { setErr("Full name required"); return; }
    if (uname.length < 3) { setErr("Username min 3 characters"); return; }
    if (b.length < 20) { setErr("Bio must be at least 20 characters"); return; }
    if (!file && !preview) { setErr("Full-face profile photo is mandatory"); return; }

    setSaving(true);
    try {
      let avatarUrl = preview && preview.startsWith("http") ? preview : null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = userId + "/avatar." + ext;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) {
          if (upErr.message.includes("Bucket") || upErr.message.includes("not found")) {
            setErr("Create a public Storage bucket named avatars in Supabase, then retry");
            setSaving(false);
            return;
          }
          setErr(upErr.message);
          setSaving(false);
          return;
        }
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = pub.publicUrl;
      }
      if (!avatarUrl) { setErr("Photo required"); setSaving(false); return; }

      const res = await saveProfile(userId, {
        full_name: name,
        username: uname,
        bio: b,
        avatar_url: avatarUrl,
      });
      if (!res.ok) { setErr(res.error || "Save failed"); setSaving(false); return; }
      router.replace("/home");
    } catch (e: any) {
      setErr(e?.message || "Failed");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading...</span>
      </div>
    );
  }

  return (
    <div className="shell" style={{ padding: 24 }}>
      <div className="logo" style={{ marginBottom: 12 }}>HATCH</div>
      <h1 className="h1" style={{ marginBottom: 6 }}>Complete your identity</h1>
      <p className="muted" style={{ fontSize: 13, marginBottom: 18, lineHeight: 1.45 }}>
        Real name, clear full-face photo, and a real bio are mandatory. No blank avatars or one-line bios.
      </p>
      {err && <div className="fail" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="card stack" style={{ marginBottom: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              width: 112, height: 112, borderRadius: "50%", margin: "0 auto 10px",
              background: preview ? "url(" + preview + ") center/cover" : "var(--grad-cool)",
              border: "3px solid rgba(139,92,246,0.5)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600,
            }}
          >
            {!preview && "Add photo"}
          </div>
          <input ref={inputRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => onPick(e.target.files?.[0] || null)} />
          <button className="btn-ghost btn-sm" type="button" onClick={() => inputRef.current?.click()}>
            Upload full-face photo
          </button>
          <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Face clearly visible - max 5MB</p>
        </div>
        <div>
          <span className="label">Full name *</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As on ID card" />
        </div>
        <div>
          <span className="label">Username * (unique)</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="like_instagram"
          />
        </div>
        <div>
          <span className="label">Bio * (min 20 chars)</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Branch, year, skills, what you want to build or find on campus..."
          />
          <p className="muted" style={{ fontSize: 11 }}>{bio.trim().length}/20 min</p>
        </div>
      </div>
      <button className="btn" style={{ width: "100%" }} disabled={saving} onClick={submit}>
        {saving ? "Saving..." : "Enter campus"}
      </button>
    </div>
  );
}
