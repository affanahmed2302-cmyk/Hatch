"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isAllowedCollegeEmail, ensureProfile, collegePodFromEmail, extractDomain } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/googleAuth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [refCode, setRefCode] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const r = q.get("ref") || "";
      if (r) setRefCode(r);
    } catch { /* ignore */ }
  }, []);

  async function signup() {
    setErr("");
    setLoading(true);
    try {
      const em = email.trim().toLowerCase();
      if (!em.includes("@")) { setErr("Enter a valid email"); setLoading(false); return; }
      if (password.length < 6) { setErr("Password min 6 characters"); setLoading(false); return; }
      if (name.trim().length < 2) { setErr("Enter your name"); setLoading(false); return; }

      const { data, error } = await supabase.auth.signUp({ email: em, password });
      if (error) { setErr(error.message); setLoading(false); return; }

      const uid = data.user?.id;
      if (uid) {
        await ensureProfile(uid, em);
        const pod = collegePodFromEmail(em);
        const dom = extractDomain(em);
        const uname = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16) || "user";
        await supabase.from("profiles").update({
          full_name: name.trim(),
          username: uname + String(Math.floor(Math.random() * 90 + 10)),
          college: pod ? pod.toUpperCase() : null,
          college_pod: pod || null,
          college_domain: dom || null,
          referred_by: refCode || null,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        }).eq("id", uid);
      }

      setMsg("Account created — set a photo on Profile when ready");
      if (data.session) router.replace("/home");
      else router.replace("/login");
    } catch (e: any) {
      setErr(e?.message || "Signup failed");
    }
    setLoading(false);
  }

  return (
    <div className="shell" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
      <div className="logo" style={{ marginBottom: 16 }}>HATCH</div>
      <h1 className="h1" style={{ marginBottom: 6 }}>Join in 30 seconds</h1>
      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Google or email + password. Photo later on Profile.</p>
      {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
      <button
        type="button"
        className="btn"
        style={{ width: "100%", marginBottom: 12, background: "linear-gradient(135deg,#fff,#e2e8f0)", color: "#0f172a" }}
        disabled={gLoading}
        onClick={async () => {
          setErr("");
          setGLoading(true);
          const res = await signInWithGoogle();
          if (!res.ok) { setErr(res.error || "Google unavailable — enable in Supabase Auth"); setGLoading(false); }
        }}
      >
        {gLoading ? "Redirecting…" : "Continue with Google"}
      </button>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12, textAlign: "center" }}>Any Google account works · or email below</p>
      {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
      <div className="stack">
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input
          type="password"
          placeholder="Password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signup()}
          autoComplete="new-password"
        />
        <button className="btn" onClick={signup} disabled={loading}>{loading ? "…" : "Create account"}</button>
      </div>
      <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
