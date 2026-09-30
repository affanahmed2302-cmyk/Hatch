"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import {
  getFeatureFlags, setFeatureFlag, fetchAdminMetrics, assistantCeoAdvice, type FeatureKey,
} from "@/lib/features";
import { listPendingClubCore, verifyClubCore } from "@/lib/clubCore";
import Nav from "@/components/Nav";

const SWITCHES: { key: FeatureKey; label: string; blurb: string }[] = [
  { key: "feature_sparks", label: "Campus Sparks", blurb: "Discreet dating portal (hidden when OFF)" },
  { key: "feature_bounties", label: "Micro-bounties", blurb: "Home bounty board" },
  { key: "feature_lounge", label: "Lounge", blurb: "Campus open chat" },
  { key: "feature_premium", label: "Premium / Circle", blurb: "Paid tier entry" },
  { key: "feature_ecosystem", label: "Ecosystem links", blurb: "Notes / Living / Market / Fuel" },
  { key: "feature_club_events", label: "Club events on feed", blurb: "Club-core posts on Home" },
  { key: "maintenance_mode", label: "Maintenance mode", blurb: "Global soft lock signal" },
];

export default function AdminDashboardPage() {
  const [email, setEmail] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [metrics, setMetrics] = useState<any>(null);
  const [advice, setAdvice] = useState<string[]>([]);
  const [cores, setCores] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh(uid?: string) {
    const [f, m, c] = await Promise.all([
      getFeatureFlags(),
      fetchAdminMetrics(),
      listPendingClubCore(),
    ]);
    setFlags(f);
    setMetrics(m);
    setCores(c);
    setAdvice(assistantCeoAdvice({ ...m, flags: f }));
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      if (!isSuperAdmin(user.email)) { router.push("/home"); return; }
      setEmail(user.email || "");
      setAdminId(user.id);
      await refresh(user.id);
      setLoading(false);
    })();
  }, [router]);

  async function toggle(key: FeatureKey) {
    const next = !flags[key];
    const res = await setFeatureFlag(key, next, email, adminId);
    if (!res.ok) setMsg(res.error || "Failed — run hatch_hub.sql");
    else {
      setMsg(`${key} → ${next ? "ON" : "OFF"}`);
      await refresh();
    }
  }

  async function verifyCore(id: string, ok: boolean) {
    await verifyClubCore(id, ok);
    setMsg(ok ? "Club core verified" : "Rejected");
    await refresh();
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading switchboard…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/settings" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 13 }}>Admin switchboard</div>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Live metrics</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="badge">Users {metrics?.totalUsers ?? 0}</span>
            <span className="badge">Online {metrics?.onlineNow ?? 0}</span>
            <span className="badge">Premium ⏳ {metrics?.premiumPending ?? 0}</span>
            <span className="badge">Events 24h {metrics?.events24h ?? 0}</span>
            <span className="badge">Sparks {metrics?.sparksProfiles ?? 0}</span>
          </div>
          {(metrics?.pods || []).slice(0, 6).map((p: any) => (
            <p key={p.pod} className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {p.pod}: {p.n}
            </p>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 12, background: "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.1))" }}>
          <div className="h2" style={{ marginBottom: 8 }}>Assistant CEO</div>
          <p className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Rule-based health + growth advice</p>
          {advice.map((a, i) => (
            <p key={i} style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>• {a}</p>
          ))}
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Kill-switches</div>
          <p className="muted" style={{ fontSize: 12 }}>Instant global ON/OFF · no redeploy</p>
          {SWITCHES.map((s) => (
            <div key={s.key} className="row" style={{ gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
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

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Club core requests</div>
          {cores.map((c) => (
            <div key={c.id} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.club_name}</div>
              <p className="muted" style={{ fontSize: 12 }}>@{c.profile?.username || "—"} · {c.profile?.email}</p>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button className="btn btn-sm" onClick={() => verifyCore(c.id, true)}>Verify</button>
                <button className="btn-ghost btn-sm" onClick={() => verifyCore(c.id, false)}>Reject</button>
              </div>
            </div>
          ))}
          {!cores.length && <p className="muted" style={{ fontSize: 12 }}>No pending core requests</p>}
        </div>

        <Link href="/admin/premium" className="btn" style={{ display: "block", textAlign: "center", marginBottom: 8 }}>
          Premium UTR approvals
        </Link>
        <Link href="/club-admin" className="btn-ghost" style={{ display: "block", textAlign: "center" }}>
          Open club-admin portal
        </Link>
      </div>
      <Nav />
    </div>
  );
}
