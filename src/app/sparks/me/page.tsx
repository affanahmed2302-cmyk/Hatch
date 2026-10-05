"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { saveSparksProfile } from "@/lib/sparks";
import { uploadUserAvatar } from "@/lib/uploadAvatar";
import PhotoSheet from "@/components/PhotoSheet";
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
  const [photoOpen, setPhotoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  async function onPhoto(file: File) {
    if (!userId) return;
    setUploading(true); setErr(""); setMsg("");
    const res = await uploadUserAvatar(userId, file);
    setUploading(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setAvatar(res.url);
    setMsg("Photo updated");
    setPhotoOpen(false);
  }

  async function save() {
    if (!userId) return;
    setErr(""); setMsg("");
    if (!consent) {
      setErr("Confirm consent to continue");
      return;
    }
    if (!avatar) {
      setErr("Add a photo — tap the circle above");
      return;
    }
    if (!gender) {
      setErr("Select gender");
      return;
    }
    const res = await saveSparksProfile(userId, {
      headline,
      vibe,
      looking_for: looking,
      meet_pref: meet,
      prompts,
      gender,
      consent: true,
    });
    if (!res.ok) setErr(res.error || "Save failed");
    else setMsg("Dating profile saved · start discovering");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/sparks" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 14 }}>Sparks profile</div>
      </div>
      <div className="page stack">
        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label="Change photo"
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              margin: "0 auto 8px",
              border: "2px solid rgba(244,114,182,0.5)",
              background: avatar
                ? `url(${avatar}) center/cover`
                : "linear-gradient(135deg,#be185d,#4c1d95)",
              position: "relative",
              padding: 0,
              display: "block",
              cursor: "pointer",
            }}
          >
            {!avatar && (
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Add photo</span>
            )}
            <span
              style={{
                position: "absolute",
                right: 2,
                bottom: 2,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.75)",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              ✎
            </span>
          </button>
          <p className="muted" style={{ fontSize: 12 }}>Tap photo to change</p>
        </div>

        <label className="row" style={{ gap: 10, alignItems: "flex-start" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="muted" style={{ fontSize: 13 }}>
            I am 18+ and agree to respectful campus dating on Sparks.
          </span>
        </label>

        <div>
          <span className="label">Gender</span>
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

      <PhotoSheet open={photoOpen} onClose={() => setPhotoOpen(false)} onFile={onPhoto} busy={uploading} />
      <SparksNav />
    </div>
  );
}
