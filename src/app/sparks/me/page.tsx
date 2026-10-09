"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, isSuperAdmin } from "@/lib/supabase";
import { saveSparksProfile } from "@/lib/sparks";
import { isDatingAppActive } from "@/lib/features";
import SparksNav from "@/components/SparksNav";

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const LOOKING_GENDER = ["Women", "Men", "Everyone"];
const INTENT = ["Casual hangouts", "Something real", "Friends first", "Not sure yet"];
const MEET = ["Nescafe", "Library", "Canteen", "Quad", "Online first"];

export default function SparksMePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [display, setDisplay] = useState("");
  const [consent, setConsent] = useState(false);
  const [gender, setGender] = useState("");
  const [lookingGender, setLookingGender] = useState("");
  const [intent, setIntent] = useState("");
  const [meet, setMeet] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [killed, setKilled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const live = await isDatingAppActive();
      if (!live && !isSuperAdmin(user.email)) {
        setKilled(true);
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("avatar_url, gender, full_name, username, bio, department, year")
        .eq("id", user.id)
        .maybeSingle();

      if (prof) {
        setAvatar(prof.avatar_url || null);
        setDisplay(displayName(prof));
        if (prof.gender) setGender(prof.gender);
      }

      const { data } = await supabase
        .from("sparks_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setMeet(data.meet_pref || "");
        setConsent(!!data.consent_at);
        const lf = (data.looking_for || "").toString();
        const parts = lf.split("·").map((s: string) => s.trim());
        if (parts[0] && LOOKING_GENDER.includes(parts[0])) setLookingGender(parts[0]);
        if (parts[1] && INTENT.includes(parts[1])) setIntent(parts[1]);
        else if (INTENT.includes(lf)) setIntent(lf);
        setReady(true);
      } else if (prof?.avatar_url && prof?.full_name) {
        setReady(false);
      }

      setLoading(false);
    })();
  }, [router]);

  async function save() {
    if (!userId) return;
    setErr("");
    if (!consent) { setErr("Confirm 18+ & campus community rules"); return; }
    if (!gender) { setErr("Select your gender"); return; }
    if (!lookingGender) { setErr("Who are you open to meeting?"); return; }
    if (!intent) { setErr("What are you looking for?"); return; }

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, username, bio, department, year, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    const name = displayName(prof || {});
    const dept = prof?.department || "BMSCE";
    const headline = `${name} · ${dept}`;
    const looking_for = `${lookingGender} · ${intent}`;

    const res = await saveSparksProfile(userId, {
      headline,
      vibe: intent,
      looking_for,
      prompts: prof?.bio ? String(prof.bio).slice(0, 200) : "",
      gender,
      meet_pref: meet || "Online first",
      consent: true,
    });

    if (!res.ok) setErr(res.error || "Save failed");
    else {
      setMsg("You're live on Sparks");
      setReady(true);
    }
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  if (killed) {
    return (
      <div className="shell">
        <div className="page" style={{ paddingTop: 40 }}>
          <div className="card">
            <div style={{ fontWeight: 800, fontSize: 18 }}>Sparks is offline</div>
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              The founder turned off Campus Sparks. Check back later.
            </p>
            <Link href="/home" className="btn" style={{ marginTop: 14, display: "inline-block" }}>Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">← Hatch</Link>
        <div className="logo" style={{ marginLeft: 8 }}>Sparks</div>
      </div>

      <div className="page stack">
        <div className="hero-card" style={{ marginBottom: 4 }}>
          <h1 className="h1" style={{ fontSize: 22, position: "relative", zIndex: 1 }}>Quick setup</h1>
          <p className="muted" style={{ fontSize: 13, position: "relative", zIndex: 1 }}>
            Photo + name come from your main Hatch profile. Only dating preferences here.
          </p>
        </div>

        <div
          className="card"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            border: "1px solid rgba(236,72,153,0.35)",
            background: "linear-gradient(160deg,rgba(236,72,153,0.12),rgba(22,22,32,0.85))",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              flexShrink: 0,
              background: avatar ? `url(${avatar}) center/cover` : "var(--grad-warm)",
              border: "2px solid rgba(236,72,153,0.4)",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>{display || "Your Hatch profile"}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {avatar ? "Photo linked from main app" : "Add a photo on Profile first"}
            </p>
            <Link href="/profile" className="muted" style={{ fontSize: 12, textDecoration: "underline" }}>
              Edit main profile →
            </Link>
          </div>
        </div>

        {!avatar && (
          <div className="fail">Add a profile photo in main Hatch Profile before going live on Sparks.</div>
        )}

        <div>
          <span className="label">I am</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {GENDERS.map((g) => (
              <button key={g} type="button" className={gender === g ? "chip on" : "chip"} onClick={() => setGender(g)}>{g}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Open to meeting</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {LOOKING_GENDER.map((g) => (
              <button key={g} type="button" className={lookingGender === g ? "chip on" : "chip"} onClick={() => setLookingGender(g)}>{g}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Looking for</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {INTENT.map((v) => (
              <button key={v} type="button" className={intent === v ? "chip on" : "chip"} onClick={() => setIntent(v)}>{v}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Prefer to meet</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {MEET.map((v) => (
              <button key={v} type="button" className={meet === v ? "chip on" : "chip"} onClick={() => setMeet(v)}>{v}</button>
            ))}
          </div>
        </div>

        <label className="row" style={{ gap: 10, alignItems: "flex-start", fontSize: 13 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          <span>I'm 18+, respect consent, and won't misuse Sparks on campus.</span>
        </label>

        {msg && <div className="ok">{msg}</div>}
        {err && <div className="fail">{err}</div>}

        <button className="btn" onClick={save} disabled={!avatar}>
          {ready ? "Update preferences" : "Go live on Sparks"}
        </button>
        {ready && (
          <Link href="/sparks" className="btn-ghost" style={{ textAlign: "center" }}>
            Start discovering →
          </Link>
        )}
      </div>
      <SparksNav />
    </div>
  );
}
