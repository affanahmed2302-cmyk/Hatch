"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import {
  getFeatureFlags, setFeatureFlag, fetchAdminMetrics, assistantCeoAdvice, type FeatureKey,
} from "@/lib/features";
import { listPendingClubCore, verifyClubCore } from "@/lib/clubCore";
import { listPendingPremium, approvePremium, rejectPremium } from "@/lib/premium";
import { displayName } from "@/lib/supabase";

/**
 * CEO PILOT COCKPIT — only affanahmed2302@gmail.com
 * Full control of every module. Normal students never see this route.
 */
const SWITCHES: { key: FeatureKey; label: string; blurb: string; hot?: boolean }[] = [
  { key: "feature_sparks", label: "🔥 Campus Sparks (Dating)", blurb: "Turn ON to show Sparks in Settings for all users. OFF = hidden from students.", hot: true },
  { key: "feature_bounties", label: "Micro-bounties", blurb: "Home bounty board" },
  { key: "feature_lounge", label: "Campus Lounge", blurb: "Discord-style open chat" },
  { key: "feature_premium", label: "Premium + Private Circle", blurb: "₹120 paid tier" },
  { key: "feature_ecosystem", label: "Ecosystem gateway", blurb: "Notes / Living / Market / Fuel links" },
  { key: "feature_club_events", label: "Club events on Home", blurb: "Club-core posts on feed" },
  { key: "maintenance_mode", label: "Maintenance mode", blurb: "Global soft lock signal" },
];

const MODULE_LINKS = [
  { href: "/sparks", label: "Open Sparks (dating)", note: "Works for you even to preview; students need flag ON" },
  { href: "/circle", label: "Private Circle", note: "Premium members only" },
  { href: "/club-admin", label: "Club Core portal", note: "Event publisher" },
  { href: "/admin/premium", label: "Premium UTR queue", note: "Approve payments" },
  { href: "/admin/dashboard", label: "Classic switchboard", note: "Same flags, simpler UI" },
  { href: "/lounge", label: "Lounge", note: "Campus chat" },
  { href: "/discover", label: "Match / Discover", note: "Networking" },
  { href: "/home", label: "Student Home", note: "What users see" },
  { href: "/leaderboard", label: "Leaderboard", note: "People + college rivalry" },
  { href: "/teams", label: "Teams", note: "Hack teams" },
  { href: "/clubs", label: "Clubs", note: "Campus clubs" },
  { href: "/premium", label: "Premium page", note: "UPI pay flow" },
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
      getFeatureFlags(),
      fetchAdminMetrics(),
      listPendingClubCore(),
      listPendingPremium(),
    ]);
    setFlags(f);
    setMetrics(m);
    setCores(c);
    setPremiums(p);
    setAdvice(assistantCeoAdvice({ ...m, flags: f }));
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      if (!isSuperAdmin(user.email)) {
        router.replace("/home");
        return;
      }
      setEmail(user.email || "");
      setAdminId(user.id);
      await refresh();
      setLoading(false);
    })();
  }, [router]);

  async function toggle(key: FeatureKey) {
    const next = !flags[key];
    const res = await setFeatureFlag(key, next, email, adminId);
    if (!res.ok) setMsg(res.error || "Failed — confirm hatch_hub.sql ran");
    else {
      setMsg(`${key.replace("feature_", "")} → ${next ? "ON ✅" : "OFF"}`);
      await refresh();
    }
  }

  async function verifyCore(id: string, ok: boolean) {
    await verifyClubCore(id, ok);
    setMsg(ok ? "Club core verified" : "Rejected");
    await refresh();
  }

  async function onPremium(id: string, ok: boolean) {
    if (!adminId) return;
    if (ok) await approvePremium(id, adminId, email);
    else await rejectPremium(id, adminId, email);
    setMsg(ok ? "Premium approved" : "Premium rejected");
    await refresh();
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Opening Pilot…</span>
      </div>
    );
  }

  return (
    <div className="shell" style={{ background: "#050508" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#7c3aed,#db2777)", border: "none" }}>
        <div style={{ fontWeight: 900, fontSize: 15, color: "#fff" }}>✈ CEO PILOT</div>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>super-admin only</span>
      </div>

      <div className="page">
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Logged in as <strong style={{ color: "#a78bfa" }}>{email}</strong>
        </p>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        {/* SPARKS BIG CONTROL */}
        <div className="card" style={{
          marginBottom: 14,
          border: "2px solid rgba(236,72,153,0.5)",
          background: "linear-gradient(135deg,rgba(236,72,153,0.2),rgba(124,58,237,0.15))",
        }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Campus Sparks · Dating</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Students only see this when status is ON. You always control it here.
          </p>
          <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 10 }}>
            <span className="badge" style={{
              background: flags.feature_sparks ? "#22c55e" : "#64748b",
              color: "#fff",
              fontSize: 14,
              padding: "6px 12px",
            }}>
              {flags.feature_sparks ? "LIVE FOR STUDENTS" : "HIDDEN FROM STUDENTS"}
            </span>
            <button className="btn" onClick={() => toggle("feature_sparks")}>
              {flags.feature_sparks ? "Turn OFF" : "Turn ON for campus"}
            </button>
          </div>
          <Link href="/sparks" className="btn-ghost" style={{ display: "block", textAlign: "center" }}>
            Open Sparks panel now →
          </Link>
        </div>

        {/* METRICS */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Flight metrics</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="badge">Users {metrics?.totalUsers ?? 0}</span>
            <span className="badge">Online {metrics?.onlineNow ?? 0}</span>
            <span className="badge">Premium ⏳ {metrics?.premiumPending ?? 0}</span>
            <span className="badge">Events 24h {metrics?.events24h ?? 0}</span>
            <span className="badge">Sparks cards {metrics?.sparksProfiles ?? 0}</span>
          </div>
          {(metrics?.pods || []).slice(0, 8).map((p: any) => (
            <p key={p.pod} className="muted" style={{ fontSize: 12, marginTop: 4 }}>{p.pod}: {p.n}</p>
          ))}
        </div>

        {/* ALL KILL SWITCHES */}
        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Master kill-switches</div>
          <p className="muted" style={{ fontSize: 12 }}>Any new feature flag we add later will show here after deploy.</p>
          {SWITCHES.map((s) => (
            <div key={s.key} className="row" style={{
              gap: 10, alignItems: "center", padding: "10px 0",
              borderTop: "1px solid var(--border)",
              background: s.hot ? "rgba(236,72,153,0.06)" : undefined,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{s.label}</div>
                <p className="muted" style={{ fontSize: 11 }}>{s.blurb}</p>
              </div>
              <button
                className={flags[s.key] ? "btn btn-sm" : "btn-ghost btn-sm"}
                onClick={() => toggle(s.key)}
              >
                {flags[s.key] ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>

        {/* ASSISTANT CEO */}
        <div className="card" style={{ marginBottom: 12, background: "linear-gradient(135deg,rgba(59,130,246,0.12),rgba(139,92,246,0.1))" }}>
          <div className="h2" style={{ marginBottom: 8 }}>Assistant CEO</div>
          {advice.map((a, i) => (
            <p key={i} style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>• {a}</p>
          ))}
        </div>

        {/* PREMIUM QUEUE INLINE */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Premium UTR queue</div>
          {premiums.map((r) => (
            <div key={r.id} style={{ marginBottom: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <div style={{ fontWeight: 700 }}>{displayName(r.profile || {})}</div>
              <p className="muted" style={{ fontSize: 12 }}>₹{r.amount_inr} · {r.plan} · ref {r.upi_ref}</p>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button className="btn btn-sm" onClick={() => onPremium(r.id, true)}>Approve</button>
                <button className="btn-ghost btn-sm" onClick={() => onPremium(r.id, false)}>Reject</button>
              </div>
            </div>
          ))}
          {!premiums.length && <p className="muted" style={{ fontSize: 12 }}>No pending payments</p>}
        </div>

        {/* CLUB CORE */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Club core requests</div>
          {cores.map((c) => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{c.club_name}</div>
              <p className="muted" style={{ fontSize: 12 }}>@{c.profile?.username || "—"}</p>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button className="btn btn-sm" onClick={() => verifyCore(c.id, true)}>Verify</button>
                <button className="btn-ghost btn-sm" onClick={() => verifyCore(c.id, false)}>Reject</button>
              </div>
            </div>
          ))}
          {!cores.length && <p className="muted" style={{ fontSize: 12 }}>No pending core requests</p>}
        </div>

        {/* ALL MODULE SHORTCUTS */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 10 }}>All modules (pilot shortcuts)</div>
          {MODULE_LINKS.map((m) => (
            <Link key={m.href} href={m.href} className="row" style={{
              display: "flex", textDecoration: "none", color: "inherit",
              padding: "10px 0", borderTop: "1px solid var(--border)", alignItems: "center",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                <p className="muted" style={{ fontSize: 11 }}>{m.note}</p>
              </div>
              <span className="muted">→</span>
            </Link>
          ))}
        </div>

        <p className="muted" style={{ fontSize: 11, textAlign: "center", marginBottom: 24 }}>
          Future features: add a flag in app_settings + SWITCHES list → auto appears here after deploy.
        </p>
      </div>
    </div>
  );
}
