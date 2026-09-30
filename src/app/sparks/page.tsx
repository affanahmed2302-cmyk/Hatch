"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel, isSuperAdmin } from "@/lib/supabase";
import { isFeatureOn } from "@/lib/features";
import Nav from "@/components/Nav";

/** Campus Sparks — students need feature flag ON; super-admin always allowed */
export default function SparksPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [consent, setConsent] = useState(false);
  const [headline, setHeadline] = useState("");
  const [vibe, setVibe] = useState("");
  const [looking, setLooking] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const admin = isSuperAdmin(user.email);
      setIsAdmin(admin);
      const on = await isFeatureOn("feature_sparks");
      const canUse = on || admin;
      setEnabled(canUse);
      if (!canUse) { setLoading(false); return; }

      const { data: mine } = await supabase.from("sparks_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (mine) {
        setHeadline(mine.headline || "");
        setVibe(mine.vibe || "");
        setLooking(mine.looking_for || "");
        setConsent(!!mine.consent_at);
      }
      const { data: rows } = await supabase
        .from("sparks_profiles")
        .select("user_id, headline, vibe, looking_for")
        .eq("is_visible", true)
        .neq("user_id", user.id)
        .limit(40);
      if (rows?.length) {
        const ids = rows.map((r) => r.user_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, department, year")
          .in("id", ids);
        const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
        setPeople(rows.map((r) => ({ ...r, profile: map[r.user_id] })).filter((r) => r.profile));
      }
      setLoading(false);
    })();
  }, [router]);

  async function save() {
    if (!userId || !consent) { setMsg("Confirm consent first"); return; }
    await supabase.from("sparks_profiles").upsert({
      user_id: userId,
      headline: headline.trim() || null,
      vibe: vibe.trim() || null,
      looking_for: looking.trim() || null,
      is_visible: true,
      consent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setMsg("Sparks card saved · be respectful");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/settings" className="btn-ghost btn-sm">←</Link>
          <div className="logo" style={{ fontSize: 14 }}>Campus Sparks</div>
        </div>
        <div className="page">
          <div className="card">
            <div className="h2">Not available</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              This module is turned off. Super-admin can enable it from CEO Pilot.
            </p>
            <Link href="/pilot" className="btn" style={{ display: "block", textAlign: "center", marginTop: 12 }}>Open Pilot</Link>
          </div>
        </div>
        <Nav />
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href={isAdmin ? "/pilot" : "/settings"} className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 14 }}>Campus Sparks</div>
      </div>
      <div className="page">
        {isAdmin && (
          <div className="card" style={{ marginBottom: 10, border: "1px solid rgba(167,139,250,0.4)" }}>
            <p style={{ fontSize: 12 }}>Admin preview · students only see this when Sparks kill-switch is ON</p>
          </div>
        )}
        <div className="card" style={{ marginBottom: 12, background: "linear-gradient(135deg,rgba(236,72,153,0.12),rgba(139,92,246,0.08))" }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Optional · private · consent first</p>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Not promoted on Home. Report abuse in chat ⋮. No spam.
          </p>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Your card</div>
          <label className="row" style={{ gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span style={{ fontSize: 12 }}>I am 18+ and consent to optional matching</span>
          </label>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Short headline" maxLength={80} />
          <input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Vibe" maxLength={120} />
          <input value={looking} onChange={(e) => setLooking(e.target.value)} placeholder="Looking for…" maxLength={120} />
          {msg && <div className="ok">{msg}</div>}
          <button className="btn btn-sm" onClick={save}>Save</button>
        </div>

        {people.map((p) => (
          <div key={p.user_id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: p.profile?.avatar_url ? `url(${p.profile.avatar_url}) center/cover` : "var(--grad-cool)",
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{displayName(p.profile || {})}</div>
                <p className="muted" style={{ fontSize: 12 }}>
                  {p.profile?.department}{p.profile?.year ? ` · ${yearToLabel(p.profile.year)}` : ""}
                </p>
              </div>
            </div>
            {p.headline && <p style={{ fontSize: 14, marginTop: 8 }}>{p.headline}</p>}
            {p.looking_for && <p className="muted" style={{ fontSize: 12 }}>Looking · {p.looking_for}</p>}
            <Link href={"/chat/" + p.user_id} className="btn btn-sm" style={{ marginTop: 8 }}>Message</Link>
          </div>
        ))}
        {!people.length && (
          <div className="empty"><p>No other cards yet — save yours first</p></div>
        )}
      </div>
      <Nav />
    </div>
  );
}
