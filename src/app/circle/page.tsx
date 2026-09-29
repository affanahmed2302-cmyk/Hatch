"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel } from "@/lib/supabase";
import { getPremiumStatus } from "@/lib/premium";
import Nav from "@/components/Nav";

/** Premium-only Private Circle — discreet campus connections. */
export default function CirclePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [headline, setHeadline] = useState("");
  const [vibe, setVibe] = useState("");
  const [looking, setLooking] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const st = await getPremiumStatus(user.id);
      if (!st.active) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      const { data: mine } = await supabase.from("circle_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (mine) {
        setHeadline(mine.headline || "");
        setVibe(mine.vibe || "");
        setLooking(mine.looking_for || "");
      }
      const { data: rows } = await supabase
        .from("circle_profiles")
        .select("user_id, headline, vibe, looking_for")
        .eq("is_visible", true)
        .neq("user_id", user.id)
        .limit(40);
      if (rows?.length) {
        const ids = rows.map((r) => r.user_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, department, year, is_premium, premium_until")
          .in("id", ids);
        const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
        const now = Date.now();
        setPeople(
          rows
            .map((r) => ({ ...r, profile: map[r.user_id] }))
            .filter((r) => {
              const p = r.profile;
              if (!p) return false;
              if (p.premium_until && new Date(p.premium_until).getTime() > now) return true;
              return !!p.is_premium;
            })
        );
      }
      setLoading(false);
    })();
  }, [router]);

  async function saveCircle() {
    if (!userId) return;
    await supabase.from("circle_profiles").upsert({
      user_id: userId,
      headline: headline.trim() || null,
      vibe: vibe.trim() || null,
      looking_for: looking.trim() || null,
      is_visible: true,
      updated_at: new Date().toISOString(),
    });
    setMsg("Circle profile saved");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/premium" className="btn-ghost btn-sm">←</Link>
          <div className="logo" style={{ fontSize: 14 }}>Private Circle</div>
        </div>
        <div className="page">
          <div className="card">
            <div className="h2">Premium members only</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              Private Circle is a discreet space for Hatch Premium members.
            </p>
            <Link href="/premium" className="btn" style={{ display: "block", textAlign: "center", marginTop: 14 }}>
              Get Premium
            </Link>
          </div>
        </div>
        <Nav />
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/premium" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 14 }}>Private Circle</div>
      </div>
      <div className="page">
        <div className="card" style={{ marginBottom: 14, background: "linear-gradient(135deg,rgba(236,72,153,0.15),rgba(139,92,246,0.1))" }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Members only · be respectful</p>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Consent first. No spam. Report anything off in chat ⋮
          </p>
        </div>

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Your circle card</div>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Short headline" maxLength={80} />
          <input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Vibe / interests" maxLength={120} />
          <input value={looking} onChange={(e) => setLooking(e.target.value)} placeholder="Looking for…" maxLength={120} />
          {msg && <div className="ok">{msg}</div>}
          <button className="btn btn-sm" onClick={saveCircle}>Save</button>
        </div>

        {people.map((p) => (
          <div key={p.user_id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: p.profile?.avatar_url ? `url(${p.profile.avatar_url}) center/cover` : "var(--grad-cool)",
              }} />
              <div style={{ flex: 1 }}>
                <div className="h2" style={{ fontSize: 15 }}>{displayName(p.profile || {})}</div>
                <p className="muted" style={{ fontSize: 12 }}>
                  {p.profile?.department}{p.profile?.year ? ` · ${yearToLabel(p.profile.year)}` : ""}
                </p>
              </div>
            </div>
            {p.headline && <p style={{ fontSize: 14, marginTop: 8 }}>{p.headline}</p>}
            {p.vibe && <p className="muted" style={{ fontSize: 12 }}>{p.vibe}</p>}
            {p.looking_for && <p className="muted" style={{ fontSize: 12 }}>Looking · {p.looking_for}</p>}
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <Link href={"/chat/" + p.user_id} className="btn btn-sm">Message</Link>
              <Link href={"/u/" + p.user_id} className="btn-ghost btn-sm">Profile</Link>
            </div>
          </div>
        ))}
        {!people.length && (
          <div className="empty">
            <p>No other members visible yet — save your card and invite premium friends</p>
          </div>
        )}
      </div>
      <Nav />
    </div>
  );
}
