"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, ensureProfile, saveProfile, suggestUsername } from "@/lib/supabase";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr("");
    const uname = (username || suggestUsername(fullName)).toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (fullName.trim().length < 2) { setErr("Display name required"); setLoading(false); return; }
    if (uname.length < 3) { setErr("Username min 3 chars"); setLoading(false); return; }
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) { setErr(error.message); setLoading(false); return; }
    if (data.user) {
      await ensureProfile(data.user.id, data.user.email);
      const res = await saveProfile(data.user.id, {
        full_name: fullName.trim(), username: uname, bio: bio.trim() || null,
        email: data.user.email, college: "BMS",
      });
      if (!res.ok) { setErr(res.error || "Profile save failed"); setLoading(false); return; }
      router.replace("/terms");
    }
  }

  return (
    <div className="shell" style={{ padding: 24 }}>
      <div className="logo" style={{ marginBottom: 24 }}>MESH</div>
      <h1 className="h1" style={{ marginBottom: 20 }}>Join MESH</h1>
      {err && <div className="fail" style={{ marginBottom: 12 }}>{err}</div>}
      <form className="stack" onSubmit={submit}>
        <div>
          <span className="label">Display name *</span>
          <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Your real name" />
        </div>
        <div>
          <span className="label">Username * (unique)</span>
          <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="like_instagram" />
        </div>
        <input type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password * (min 6)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        <textarea placeholder="Bio / interests (optional)" value={bio} onChange={e => setBio(e.target.value)} rows={2} />
        <button className="btn" type="submit" disabled={loading}>{loading ? "…" : "Create account"}</button>
      </form>
      <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
        Have an account? <Link href="/login" style={{ color: "var(--accent)" }}>Log in</Link>
      </p>
    </div>
  );
}
