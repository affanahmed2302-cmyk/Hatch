"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Recovery session lands via URL hash / exchange
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save() {
    setErr(""); setMsg("");
    if (password.length < 6) {
      setErr("Password min 6 characters");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setErr(error.message);
      else {
        setMsg("Password updated. Redirecting…");
        setTimeout(() => router.replace("/home"), 1200);
      }
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    }
    setLoading(false);
  }

  return (
    <div className="shell" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
      <div className="logo" style={{ marginBottom: 12 }}>HATCH</div>
      <h1 className="h1" style={{ marginBottom: 8, fontSize: 22 }}>New password</h1>
      {!ready && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Open the link from your email on this device. If this page opened without the email link, request a new one.
        </p>
      )}
      {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
      {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
      <div className="stack">
        <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <button className="btn" onClick={save} disabled={loading || !ready}>
          {loading ? "Saving…" : "Update password"}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
        <Link href="/forgot-password">Request new link</Link> · <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
