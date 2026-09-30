"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import { isFeatureOn } from "@/lib/features";
import { saveSparksProfile } from "@/lib/sparks";
import SparksNav from "@/components/SparksNav";

export default function SparksMePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [headline, setHeadline] = useState("");
  const [vibe, setVibe] = useState("");
  const [looking, setLooking] = useState("");
  const [prompts, setPrompts] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const on = await isFeatureOn("feature_sparks");
      if (!on && !isSuperAdmin(user.email)) { router.replace("/home"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("sparks_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setHeadline(data.headline || "");
        setVibe(data.vibe || "");
        setLooking(data.looking_for || "");
        setPrompts(data.prompts || "");
        setConsent(!!data.consent_at);
      }
      setLoading(false);
    })();
  }, [router]);

  async function save() {
    if (!userId) return;
    if (!consent) { setMsg("Confirm consent to continue"); return; }
    const res = await saveSparksProfile(userId, {
      headline, vibe, looking_for: looking, prompts, consent: true,
    });
    if (!res.ok) setMsg(res.error || "Save failed");
    else setMsg("Profile live on Discover");
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#0a0610" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#be185d,#7c3aed)", border: "none" }}>
        <Link href="/home" className="btn-ghost btn-sm" style={{ color: "#fff" }}>Campus</Link>
        <div style={{ fontWeight: 900, color: "#fff" }}>My Sparks</div>
      </div>
      <div className="page stack" style={{ paddingBottom: 90 }}>
        <p className="muted" style={{ fontSize: 12 }}>
          Separate dating app inside Hatch. Not shown on main Home unless admin enables the secret link.
        </p>
        <label className="row" style={{ gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span style={{ fontSize: 12 }}>I am 18+ and consent to optional matching</span>
        </label>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" maxLength={80} />
        <input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Your vibe" maxLength={120} />
        <input value={looking} onChange={(e) => setLooking(e.target.value)} placeholder="Looking for" maxLength={120} />
        <textarea value={prompts} onChange={(e) => setPrompts(e.target.value)} placeholder="Prompt / fun fact" rows={3} maxLength={280} />
        {msg && <div className="ok">{msg}</div>}
        <button className="btn" onClick={save}>Save & show on Discover</button>
        <Link href="/sparks" className="btn-ghost" style={{ textAlign: "center" }}>Start discovering →</Link>
      </div>
      <SparksNav />
    </div>
  );
}
