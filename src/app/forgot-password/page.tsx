"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const REDIRECT = "https://hatch-primeora.vercel.app/reset-password";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    setErr(""); setMsg(""); setLoading(true);
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) {
      setErr("Enter a valid email");
      setLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: REDIRECT,
      });
      if (error) setErr(error.message);
      else setMsg("Check your email for the reset link. Open it on this phone, then set a new password.");
    } catch (ex: any) {
      setErr(ex?.message || "Could not send reset email");
    }
    setLoading(false);
  }

  return (
    <div className="shell" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
      <Link href="/login" className="btn-ghost btn-sm" style={{ alignSelf: "flex-start", marginBottom: 16 }}>← Back</Link>
      <div className="logo" style={{ marginBottom: 12 }}>HATCH</div>
      <h1 className="h1" style={{ marginBottom: 8, fontSize: 22 }}>Forgot password</h1>
      <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.45 }}>
        We&apos;ll email you a secure link to set a new password.
      </p>
      {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
      {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
      <div className="stack">
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn" onClick={send} disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
        In Supabase: Authentication → URL Configuration → add<br />
        <code style={{ fontSize: 11 }}>{REDIRECT}</code>
      </p>
    </div>
  );
}
