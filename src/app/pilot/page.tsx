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

const MODULE_LINKS = [
  { href: "/sparks", label: "Sparks dating app", note: "Discover · Likes · Matches · Me" },
  { href: "/clubs-hq", label: "Clubs HQ (60+ onboard)", note: "Bulk seed + manage clubs" },
  { href: "/clubs", label: "Student clubs browse", note: "What students see" },
  { href: "/circle", label: "Private Circle", note: "Premium only" },
  { href: "/club-admin", label: "Club Core events", note: "Publish to Home feed" },
  { href: "/admin/premium", label: "Premium UTR", note: "Payments" },
  { href: "/lounge", label: "Lounge", note: "Open chat" },
  { href: "/discover", label: "Career Match", note: "Networking (not dating)" },
  { href: "/home", label: "Campus Home", note: "Main app" },
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

        <div className="card" style={{
          marginBottom: 14, border: "2px solid rgba(236,72,153,0.5)",
          background: "linear-gradient(135deg,rgba(236,72,153,0.2),rgba(124,58,237,0.15))",
        }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>1 · Sparks dating app</div>
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 10px" }}>
            Separate mini-app (Discover / Likes / Matches / Me). Not mixed into campus Home.
          </p>
          <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span className="badge" style={{ background: flags.feature_sparks ? "#22c55e" : "#64748b", color: "#fff" }}>
              {flags.feature_sparks ? "SECRET LINK ON" : "SECRET LINK OFF"}
            </span>
            <button className="btn btn-sm" onClick={() => toggle("feature_sparks")}>
              {flags.feature_sparks ? "Hide from students" : "Show secret entry"}
            </button>
          </div>
          <Link href="/sparks" className="btn" style={{ display: "block", textAlign: "center" }}>Open full Sparks app →</Link>
        </div>

        <div className="card" style={{
          marginBottom: 14, border: "2px solid rgba(14,165,233,0.45)",
          background: "linear-gradient(135deg,rgba(14,165,233,0.15),rgba(99,102,241,0.12))",
        }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>2 · Clubs HQ (60+)</div>
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 10px" }}>
            Bulk seed ~60 BMSCE-style clubs in one tap. Manage from HQ; students browse /clubs.
          </p>
          <Link href="/clubs-hq" className="btn" style={{ display: "block", textAlign: "center" }}>Open Clubs HQ →</Link>
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
          <div className="h2" style={{ marginBottom: 8 }}>Club core</div>
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
          <div className="h2" style={{ marginBottom: 8 }}>All portals</div>
          {MODULE_LINKS.map((m) => (
            <Link key={m.href} href={m.href} style={{
              display: "flex", textDecoration: "none", color: "inherit",
              padding: "10px 0", borderTop: "1px solid var(--border)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                <p className="muted" style={{ fontSize: 11 }}>{m.note}</p>
              </div>
              <span className="muted">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
