"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  PLANS, UPI_DISPLAY, UPI_NUMBER, getPremiumStatus, submitPremiumRequest, type PlanId,
} from "@/lib/premium";
import Nav from "@/components/Nav";

export default function PremiumPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [until, setUntil] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanId>("1m");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const st = await getPremiumStatus(user.id);
      setActive(st.active);
      setUntil(st.until);
      setLoading(false);
    })();
  }, [router]);

  async function submit() {
    if (!userId) return;
    setSending(true); setErr(""); setMsg("");
    const res = await submitPremiumRequest(userId, plan, ref, note);
    if (!res.ok) setErr(res.error || "Failed");
    else {
      setMsg("Request sent · admin will approve within 24 hours after payment is verified");
      setRef(""); setNote("");
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/profile" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 14 }}>Hatch Premium</div>
      </div>
      <div className="page">
        {active ? (
          <div className="card" style={{ marginBottom: 14, background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(139,92,246,0.15))" }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>✦ Premium active</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Until {until ? new Date(until).toLocaleDateString() : "—"}
            </p>
            <Link href="/circle" className="btn" style={{ display: "block", textAlign: "center", marginTop: 12 }}>
              Open Private Circle
            </Link>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 14, background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(236,72,153,0.12))" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Unlock more of campus</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
              Premium is optional. Career tools stay free. Premium unlocks extra privacy tools and Private Circle.
            </p>
          </div>
        )}

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">What you get</div>
          <p style={{ fontSize: 13 }}>• Private Circle — discreet campus connections (premium members only)</p>
          <p style={{ fontSize: 13 }}>• Priority profile boost on Discover</p>
          <p style={{ fontSize: 13 }}>• Unlimited saves & advanced filters</p>
          <p style={{ fontSize: 13 }}>• Premium badge on your public profile</p>
          <p style={{ fontSize: 13 }}>• Early access to new campus features</p>
        </div>

        {!active && (
          <>
            <div className="card stack" style={{ marginBottom: 14 }}>
              <div className="h2">Choose plan</div>
              <div className="row" style={{ gap: 8 }}>
                <button className={plan === "1m" ? "btn" : "btn-ghost"} style={{ flex: 1 }} onClick={() => setPlan("1m")}>
                  ₹{PLANS["1m"].amount} · {PLANS["1m"].label}
                </button>
                <button className={plan === "3m" ? "btn" : "btn-ghost"} style={{ flex: 1 }} onClick={() => setPlan("3m")}>
                  ₹{PLANS["3m"].amount} · {PLANS["3m"].label}
                </button>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>Best value: 3 months at ₹{PLANS["3m"].amount} (₹100/mo)</p>
            </div>

            <div className="card stack" style={{ marginBottom: 14 }}>
              <div className="h2">Pay via UPI</div>
              <p style={{ fontSize: 14 }}>Send <strong>₹{PLANS[plan].amount}</strong> to</p>
              <p style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>{UPI_DISPLAY}</p>
              <p className="muted" style={{ fontSize: 12 }}>PhonePe / GPay / any UPI · number {UPI_NUMBER}</p>
              <p className="muted" style={{ fontSize: 12 }}>
                After paying, paste the UPI reference / UTR below. Admin verifies and activates within 24 hours.
              </p>
              <div>
                <span className="label">UPI ref / UTR *</span>
                <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 123456789012" />
              </div>
              <div>
                <span className="label">Note (optional)</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Your name on UPI" />
              </div>
              {err && <div className="fail">{err}</div>}
              {msg && <div className="ok">{msg}</div>}
              <button className="btn" onClick={submit} disabled={sending || ref.trim().length < 4}>
                {sending ? "Submitting…" : "I paid · submit for approval"}
              </button>
            </div>
          </>
        )}

        <p className="muted" style={{ fontSize: 11, textAlign: "center" }}>
          Manual verification protects both sides. No auto-charge.
        </p>
      </div>
      <Nav />
    </div>
  );
}
