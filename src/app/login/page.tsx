"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, ensureProfile, needsTermsAcceptance } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/googleAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const router = useRouter();

  async function login() {
    setErr("");
    setLoading(true);
    try {
      const em = email.trim().toLowerCase();
      if (!em.includes("@")) {
        setErr("Enter a valid email");
        setLoading(false);
        return;
      }
      if (!password) {
        setErr("Enter your password");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: em,
        password,
      });
      if (error) {
        const m = error.message || "";
        if (m.toLowerCase().includes("invalid login") || m.toLowerCase().includes("invalid credentials")) {
          setErr("Wrong email or password");
        } else if (m.toLowerCase().includes("confirm") || m.toLowerCase().includes("not confirmed")) {
          setErr("Confirm your email from the inbox link, then log in");
        } else {
          setErr(m);
        }
        setLoading(false);
        return;
      }
      if (data.user) {
        await ensureProfile(data.user.id, data.user.email);
        try {
          if (await needsTermsAcceptance(data.user.id)) {
            router.replace("/terms");
            return;
          }
        } catch {
          /* continue to home */
        }
        router.replace("/home");
      }
    } catch (e: any) {
      setErr(e?.message || "Login failed — check network");
    }
    setLoading(false);
  }

  async function google() {
    setErr("");
    setGLoading(true);
    const res = await signInWithGoogle();
    if (!res.ok) {
      setErr(res.error || "Google sign-in unavailable — enable Google in Supabase Auth");
      setGLoading(false);
    }
  }

  return (
    <div
      className="shell"
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: "100dvh",
      }}
    >
      <div className="logo" style={{ marginBottom: 20 }}>HATCH</div>
      <h1 className="h1" style={{ marginBottom: 8 }}>Welcome back</h1>
      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        College network · BMSCE first
      </p>
      {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
      <button
        type="button"
        className="btn"
        style={{ width: "100%", marginBottom: 12, background: "linear-gradient(135deg,#fff,#e2e8f0)", color: "#0f172a" }}
        onClick={google}
        disabled={gLoading}
      >
        {gLoading ? "Redirecting…" : "Continue with Google"}
      </button>
      <p className="muted" style={{ fontSize: 12, marginBottom: 14, textAlign: "center" }}>
        Prefer college Google (.ac.in / .edu) · proves real mailbox
      </p>
      <p className="muted" style={{ fontSize: 11, marginBottom: 10, textAlign: "center" }}>or email</p>
      <div className="stack">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          autoComplete="current-password"
        />
        <button className="btn" onClick={login} disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </button>
      </div>
      <p style={{ marginTop: 12, fontSize: 13 }}>
        <Link href="/forgot-password" className="muted">
          Forgot password?
        </Link>
      </p>
      <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
        New here? <Link href="/signup">Create account</Link>
      </p>
    </div>
  );
}
