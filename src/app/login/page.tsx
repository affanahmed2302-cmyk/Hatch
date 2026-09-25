"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, ensureProfile, needsTermsAcceptance } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setErr(error.message); setLoading(false); return; }
    if (data.user) {
      await ensureProfile(data.user.id, data.user.email);
      const need = await needsTermsAcceptance(data.user.id);
      router.replace(need ? "/terms" : "/home");
    }
  }

  return (
    <div className="shell" style={{ padding: 24 }}>
      <div className="logo" style={{ marginBottom: 24 }}>MESH</div>
      <h1 className="h1" style={{ marginBottom: 20 }}>Log in</h1>
      {err && <div className="fail" style={{ marginBottom: 12 }}>{err}</div>}
      <form className="stack" onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="btn" type="submit" disabled={loading}>{loading ? "…" : "Log in"}</button>
      </form>
      <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
        New here? <Link href="/signup" style={{ color: "var(--accent)" }}>Sign up</Link>
      </p>
    </div>
  );
}
