"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isAllowedCollegeEmail, ensureProfile } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function startOtp() {
    setErr("");
    const domain = isAllowedCollegeEmail(email);
    if (!domain.ok) { setErr(domain.error || "Invalid email"); return; }
    if (password.length < 6) { setErr("Password min 6 characters"); return; }
    const ph = phone.replace(/\D/g, "");
    if (ph.length < 10) { setErr("Enter a valid 10-digit phone"); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentOtp(code);
    setStep("otp");
    setMsg(`OTP sent (demo): ${code}`);
  }

  async function finishSignup() {
    setErr(""); setLoading(true);
    try {
      if (otp !== sentOtp) { setErr("Wrong OTP"); setLoading(false); return; }
      const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
      if (error) { setErr(error.message); setLoading(false); return; }
      const uid = data.user?.id;
      if (uid) {
        await ensureProfile(uid, email.trim().toLowerCase());
        await supabase.from("profiles").update({
          phone: phone.replace(/\D/g, "").slice(-10),
          phone_verified: true,
          college: "BMS",
        }).eq("id", uid);
      }
      router.replace("/terms");
    } catch (e: any) {
      setErr(e?.message || "Signup failed");
    }
    setLoading(false);
  }

  return (
    <div className="shell" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
      <div className="logo" style={{ marginBottom: 20 }}>HATCH</div>
      <h1 className="h1" style={{ marginBottom: 8 }}>Join campus</h1>
      <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>BMS institutional email required</p>
      {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
      {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
      {step === "form" ? (
        <div className="stack">
          <input type="email" placeholder="you@bmsce.ac.in" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password (min 6)" value={password} onChange={e => setPassword(e.target.value)} />
          <input type="tel" placeholder="Phone (OTP)" value={phone} onChange={e => setPhone(e.target.value)} />
          <button className="btn" onClick={startOtp}>Continue</button>
        </div>
      ) : (
        <div className="stack">
          <input inputMode="numeric" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />
          <button className="btn" onClick={finishSignup} disabled={loading}>{loading ? "Creating…" : "Verify & create"}</button>
          <button className="btn-ghost" onClick={() => setStep("form")}>Back</button>
        </div>
      )}
      <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
        Have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
