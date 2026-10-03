"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin, displayName } from "@/lib/supabase";
import {
  getFeatureFlags, setFeatureFlag, fetchAdminMetrics, assistantCeoAdvice, type FeatureKey,
} from "@/lib/features";
import { listPendingClubCore, verifyClubCore } from "@/lib/clubCore";
import { listPendingPremium, approvePremium, rejectPremium } from "@/lib/premium";

const SWITCHES: { key: FeatureKey; label: string; blurb: string; hot?: boolean }[] = [
  { key: "feature_sparks", label: "🔥 Sparks dating app", blurb: "Secret link for students when ON. Full mini-app at /sparks", hot: true },
  { key: "feature_bounties", label: "Micro-bounties", blurb: "Home bounty board" },
  { key: "feature_lounge", label: "Campus Lounge", blurb: "Discord-style open chat" },
  { key: "feature_premium", label: "Premium + Private Circle", blurb: "₹120 paid tier" },
  { key: "feature_ecosystem", label: "Ecosystem gateway", blurb: "Notes / Living / Market / Fuel" },
  { key: "feature_club_events", label: "Club events on Home", blurb: "Club-core posts on feed" },
  { key: "maintenance_mode", label: "Maintenance mode", blurb: "Global soft lock" },
];

export default function PilotPage() {
  const [email, setEmail] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [metrics, setMetrics] = useState<any>(null);
  const [advice, setAdvice] = useState<string[]>([]);
  const [cores, setCores] = useState<any[]>([]);
  const [premiums, setPremiums] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh() {
    const [f, m, c, p] = await Promise.all([
      getFeatureFlags(), fetchAdminMetrics(), listPendingClubCore(), listPendingPremium(),
    ]);
    setFlags(f); setMetrics(m); setCores(c); setPremiums(p);
    setAdvice(assistantCeoAdvice({ ...m, flags: f }));
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      if (!isSuperAdmin(user.email)) { router.replace("/home"); return; }
      setEmail(user.email || "");
      setAdminId(user.id);
      await refresh();
      setLoading(false);
    })();
  }, [router]);

  async function toggle(key: FeatureKey) {
    const next = !flags[key];
    const res = await setFeatureFlag(key, next, email, adminId);
    if (!res.ok) setMsg(res.error || "Failed");
    else { setMsg(`${key} → ${next ? "ON" : "OFF"}`); await refresh(); }
  }

  async function verifyCore(id: string, ok: boolean) {
    await verifyClubCore(id, ok);
    setMsg(ok ? "Verified" : "Rejected");
    await refresh();
  }

  async function onPremium(id: string, ok: boolean) {
    if (!adminId) return;
    if (ok) await approvePremium(id, adminId, email);
    else await rejectPremium(id, adminId, email);
    setMsg(ok ? "Premium approved" : "Rejected");
    await refresh();
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Pilot…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#050508" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#7c3aed,#db2777)", border: "none" }}>
        <div style={{ fontWeight: 900, fontSize: 15, color: "#fff" }}>✈ CEO PILOT</div>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>super-admin</span>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Signed in as <strong style={{ color: "#a78bfa" }}>{email}</strong></p>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(52,211,153,0.4)" }}>
          <div style={{ fontWeight: 800 }}>Launch controls</div>
          <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <Link href="/pilot/clubs" className="btn btn-sm">Clubs + Captains</Link>
            <Link href="/pilot/commerce" className="btn btn-sm">Coupons + payments</Link>
            <Link href="/sparks" className="btn-ghost btn-sm">Sparks app</Link>
          </div>
        </div>

        <div className="card" style={{
          marginBottom: 14, border: "2px solid rgba(236,72,153,0.5)",
          background: "linear-gradient(135deg,rgba(236,72,153,0.2),rgba(124,58,237,0.15))",
        }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Sparks dating</div>
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 10px" }}>
            Toggle secret student entry. Coupons: /pilot/commerce (100% = free unlock).
          </p>
          <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span className="badge" style={{ background: flags.feature_sparks ? "#22c55e" : "#64748b", color: "#fff" }}>
              {flags.feature_sparks ? "ENTRY ON" : "ENTRY OFF"}
            </span>
            <button className="btn btn-sm" onClick={() => toggle("feature_sparks")}>
              {flags.feature_sparks ? "Hide" : "Show entry"}
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Metrics</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="badge">Users {metrics?.totalUsers ?? 0}</span>
            <span className="badge">Online {metrics?.onlineNow ?? 0}</span>
            <span className="badge">Premium ⏳ {metrics?.premiumPending ?? 0}</span>
            <span className="badge">Sparks {metrics?.sparksProfiles ?? 0}</span>
          </div>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Kill-switches</div>
          {SWITCHES.map((s) => (
            <div key={s.key} className="row" style={{ gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                <p className="muted" style={{ fontSize: 11 }}>{s.blurb}</p>
              </div>
              <button className={flags[s.key] ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => toggle(s.key)}>
                {flags[s.key] ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Assistant CEO</div>
          {advice.map((a, i) => <p key={i} style={{ fontSize: 13, marginBottom: 6 }}>• {a}</p>)}
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Premium queue</div>
          {premiums.map((r) => (
            <div key={r.id} style={{ marginBottom: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <div style={{ fontWeight: 700 }}>{displayName(r.profile || {})}</div>
              <p className="muted" style={{ fontSize: 12 }}>₹{r.amount_inr} · {r.upi_ref}</p>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button className="btn btn-sm" onClick={() => onPremium(r.id, true)}>Approve</button>
                <button className="btn-ghost btn-sm" onClick={() => onPremium(r.id, false)}>Reject</button>
              </div>
            </div>
          ))}
          {!premiums.length && <p className="muted" style={{ fontSize: 12 }}>Empty</p>}
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Club core requests</div>
          {cores.map((c) => (
            <div key={c.id} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{c.club_name}</div>
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <button className="btn btn-sm" onClick={() => verifyCore(c.id, true)}>Verify</button>
                <button className="btn-ghost btn-sm" onClick={() => verifyCore(c.id, false)}>Reject</button>
              </div>
            </div>
          ))}
          {!cores.length && <p className="muted" style={{ fontSize: 12 }}>None</p>}
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Plan preview (what buyers unlock)</div>
          <p style={{ fontSize: 13, marginBottom: 6 }}><b>Sparks ₹150</b> — Discover, likes, matches, campus dating profile</p>
          <p style={{ fontSize: 13, marginBottom: 6 }}><b>Premium ₹120</b> — Private Circle, boosts</p>
          <p style={{ fontSize: 13, marginBottom: 6 }}><b>Legends ₹999</b> — exclusive society chat</p>
          <p className="muted" style={{ fontSize: 11 }}>Coupons can make any of these free (100% off) from Commerce.</p>
        </div>
      </div>
    </div>
  );
}
