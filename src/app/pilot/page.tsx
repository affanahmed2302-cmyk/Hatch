"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin, displayName } from "@/lib/supabase";
import {
  getFeatureFlags, setFeatureFlag, fetchAdminMetrics, assistantCeoAdvice, fetchAdminReports,
  getConfessionWindow, setConfessionWindow, type FeatureKey,
} from "@/lib/features";
import { listPendingClubCore, verifyClubCore } from "@/lib/clubCore";
import { listPendingPremium, approvePremium, rejectPremium } from "@/lib/premium";

const SWITCHES: { key: FeatureKey; label: string; blurb: string; hot?: boolean }[] = [
  { key: "feature_sparks", label: "Sparks dating app", blurb: "OFF = hidden on Home/Explore + /sparks blocked", hot: true },
  { key: "feature_confessions", label: "Confessions", blurb: "OFF = confession flows off. Window below.", hot: true },
  { key: "feature_bounties", label: "Micro-bounties", blurb: "Home bounty board" },
  { key: "feature_lounge", label: "Campus Lounge", blurb: "Discord-style open chat" },
  { key: "feature_premium", label: "Premium + Private Circle", blurb: "Paid tier" },
  { key: "feature_ecosystem", label: "Ecosystem gateway", blurb: "Notes / Living / Market" },
  { key: "feature_club_events", label: "Club events on Home", blurb: "Club-core posts on feed" },
  { key: "feature_club_portal", label: "Club portal", blurb: "Club leads workspace" },
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
  const [reports, setReports] = useState<any[]>([]);
  const [confStart, setConfStart] = useState(0);
  const [confEnd, setConfEnd] = useState(3);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh() {
    const [f, m, c, p, r, win] = await Promise.all([
      getFeatureFlags(), fetchAdminMetrics(), listPendingClubCore(), listPendingPremium(),
      fetchAdminReports(30), getConfessionWindow(),
    ]);
    setFlags(f); setMetrics(m); setCores(c); setPremiums(p); setReports(r);
    setConfStart(win.start); setConfEnd(win.end);
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
    if (!res.ok) setMsg(res.error || "Failed — run hatch_killswitches.sql if app_settings missing");
    else {
      setMsg(`${key} → ${next ? "ON" : "OFF"}`);
      // optimistic
      setFlags((prev) => {
        const copy = { ...prev, [key]: next };
        if (key === "feature_sparks" || key === "dating_app_active") {
          copy.feature_sparks = next;
          copy.dating_app_active = next;
        }
        return copy;
      });
      await refresh();
    }
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

  async function saveConfWindow() {
    const res = await setConfessionWindow(confStart, confEnd, email, adminId);
    if (!res.ok) setMsg(res.error || "Failed to save window");
    else { setMsg(`Confession window ${confStart}:00 – ${confEnd}:00 saved`); await refresh(); }
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Pilot…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#050508" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#7c3aed,#db2777)", border: "none" }}>
        <div style={{ fontWeight: 900, fontSize: 15, color: "#fff" }}>CEO PILOT</div>
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: 14, border: "2px solid rgba(236,72,153,0.45)" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Feature kill-switches</div>
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 10px" }}>OFF hides the feature for normal users. Hard-refresh the app after toggling.</p>
          {SWITCHES.map((s) => (
            <div key={s.key} className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                <p className="muted" style={{ fontSize: 11 }}>{s.blurb}</p>
              </div>
              <button
                type="button"
                className={flags[s.key] ? "btn btn-sm" : "btn-ghost btn-sm"}
                style={flags[s.key] ? { background: "#10b981" } : { opacity: 0.85 }}
                onClick={() => toggle(s.key)}
              >
                {flags[s.key] ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(251,191,36,0.35)" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Confession timing</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Only when Confessions is ON. Overnight ok (e.g. 0 → 3 = midnight–3am).
          </p>
          <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontSize: 12 }}>Start hour{" "}
              <input type="number" min={0} max={23} value={confStart} onChange={(e) => setConfStart(Number(e.target.value))} style={{ width: 64, marginLeft: 6 }} />
            </label>
            <label style={{ fontSize: 12 }}>End hour{" "}
              <input type="number" min={0} max={23} value={confEnd} onChange={(e) => setConfEnd(Number(e.target.value))} style={{ width: 64, marginLeft: 6 }} />
            </label>
            <button type="button" className="btn btn-sm" onClick={saveConfWindow}>Save window</button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>User reports</div>
          {!reports.length && <p className="muted" style={{ fontSize: 12 }}>No reports yet</p>}
          {reports.map((r: any) => (
            <div key={r.id} style={{ marginBottom: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <p style={{ fontSize: 13 }}>
                <strong>{displayName(r.reporter || {})}</strong>
                <span className="muted"> reported </span>
                <strong>{displayName(r.reported || {})}</strong>
              </p>
              <p className="muted" style={{ fontSize: 12 }}>{r.reason}{r.details ? ` — ${r.details}` : ""}</p>
              <p className="muted" style={{ fontSize: 11 }}>{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</p>
            </div>
          ))}
        </div>

        {metrics && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Metrics</div>
            <p style={{ fontSize: 13 }}>Users {metrics.users} · Messages {metrics.messages} · Premium pending {metrics.premiumPending}</p>
            <p style={{ fontSize: 13 }}>Club events {metrics.clubEvents} · Sparks profiles {metrics.sparksProfiles}</p>
          </div>
        )}

        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Assistant CEO</div>
          {advice.map((a, i) => <p key={i} style={{ fontSize: 13, marginBottom: 6 }}>• {a}</p>)}
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Premium queue</div>
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

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Club core requests</div>
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
      </div>
    </div>
  );
}
