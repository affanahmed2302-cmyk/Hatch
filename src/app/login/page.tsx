"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, ensureProfile, needsTermsAcceptance } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function login() {
    setErr(""); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) { setErr(error.message); setLoading(false); return; }
      if (data.user) {
        await ensureProfile(data.user.id, data.user.email);
        if (await needsTermsAcceptance(data.user.id)) router.replace("/terms");
        else router.replace("/home");
      }
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    }
    setLoading(false);
  }

  return (
    <div className="shell" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
      <div className="logo" style={{ marginBottom: 20 }}>HATCH</div>
      <h1 className="h1" style={{ marginBottom: 16 }}>Welcome back</h1>
      {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
      <div className="stack">
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
        <button className="btn" onClick={login} disabled={loading}>{loading ? "…" : "Log in"}</button>
      </div>
      <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
        New here? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
