"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { saveSparksProfile } from "@/lib/sparks";
import SparksNav from "@/components/SparksNav";

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const VIBES = ["Chill", "Chaotic", "Gym & chai", "Night owl", "Soft girl/boy", "Ambivert", "Foodie", "Music head"];
const LOOKING = ["Casual hangouts", "Something real", "Study + vibes", "Not sure yet", "Friends first"];
const MEET = ["Nescafe", "Library", "Canteen", "Quad", "Weekend only", "Online first"];
const PROMPT_IDEAS = [
  "My ideal first hang on campus is…",
  "You'll find me most at…",
  "A green flag I notice is…",
  "Worst CIE memory…",
  "I'm looking for someone who…",
];

export default function SparksMePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [gender, setGender] = useState("");
  const [headline, setHeadline] = useState("");
  const [vibe, setVibe] = useState("");
  const [looking, setLooking] = useState("");
  const [meet, setMeet] = useState("");
  const [prompts, setPrompts] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("avatar_url, gender, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.avatar_url) setAvatar(prof.avatar_url);
      if (prof?.gender) setGender(prof.gender);

      const { data } = await supabase.from("sparks_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setHeadline(data.headline || "");
        setVibe(data.vibe || "");
        setLooking(data.looking_for || "");
        setMeet(data.meet_pref || "");
        setPrompts(data.prompts || "");
        if (data.gender) setGender(data.gender);
        setConsent(!!data.consent_at);
      }
      setLoading(false);
    })();
  }, [router]);

  async function save() {
    if (!userId) return;
    setErr(""); setMsg("");
    if (!consent) { setErr("Confirm 18+ consent"); return; }
    if (!gender) { setErr("Pick how you identify (helps matching)"); return; }
    if (!headline.trim() && !vibe) { setErr("Add a short intro or vibe"); return; }
    if (!avatar) {
      setErr("Add a profile photo on main Hatch profile first — dating needs a face");
      return;
    }
    const res = await saveSparksProfile(userId, {
      headline: headline || vibe,
      vibe,
      looking_for: looking,
      meet_pref: meet,
      prompts,
      gender,
      consent: true,
    });
    if (!res.ok) setErr(res.error || "Save failed — run hatch_dating_fields.sql");
    else setMsg("You're live on Sparks Discover");
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#0a0610" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#be185d,#7c3aed)", border: "none" }}>
        <Link href="/home" className="btn-ghost btn-sm" style={{ color: "#fff" }}>Campus</Link>
        <div style={{ fontWeight: 900, color: "#fff" }}>Dating profile</div>
      </div>
      <div className="page stack" style={{ paddingBottom: 90 }}>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
          This is for <strong>campus dating / hangouts</strong> — not jobs or GitHub.
          Use a real photo + honest vibe.
        </p>

        <div className="card" style={{ textAlign: "center" }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%", margin: "0 auto",
            background: avatar ? `url(${avatar}) center/cover` : "linear-gradient(135deg,#be185d,#4c1d95)",
            border: "2px solid rgba(244,114,182,0.5)",
          }} />
          {!avatar && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              No photo yet → <Link href="/profile">add on main profile</Link>
            </p>
          )}
        </div>

        <label className="row" style={{ gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span style={{ fontSize: 12 }}>I am 18+ and want optional campus matching</span>
        </label>

        <div>
          <span className="label">I am</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {GENDERS.map((g) => (
              <button key={g} type="button" className={gender === g ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setGender(g)}>{g}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">One-line intro</span>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. 2nd year · love late walks + filter coffee" maxLength={80} />
        </div>

        <div>
          <span className="label">Vibe</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {VIBES.map((v) => (
              <button key={v} type="button" className={vibe === v ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setVibe(v)}>{v}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Looking for</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {LOOKING.map((v) => (
              <button key={v} type="button" className={looking === v ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setLooking(v)}>{v}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Prefer to meet at</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {MEET.map((v) => (
              <button key={v} type="button" className={meet === v ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setMeet(v)}>{v}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Prompt answer</span>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {PROMPT_IDEAS.map((p) => (
              <button key={p} type="button" className="btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setPrompts(p + " ")}>{p.slice(0, 28)}…</button>
            ))}
          </div>
          <textarea value={prompts} onChange={(e) => setPrompts(e.target.value)} placeholder="Finish a prompt…" rows={3} maxLength={280} />
        </div>

        {msg && <div className="ok">{msg}</div>}
        {err && <div className="fail">{err}</div>}
        <button className="btn" onClick={save}>Save dating profile</button>
        <Link href="/sparks" className="btn-ghost" style={{ textAlign: "center" }}>Start discovering →</Link>
      </div>
      <SparksNav />
    </div>
  );
}
