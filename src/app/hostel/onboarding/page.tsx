"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { saveHostelProfile, fetchHostelProfile, type LivingType } from "@/lib/hostel";

const LIVING: { id: LivingType; label: string }[] = [
  { id: "hostel", label: "Hostel" },
  { id: "pg", label: "PG" },
  { id: "shared_flat", label: "Shared flat" },
  { id: "rented_room", label: "Rented room" },
  { id: "day_hosteller", label: "Day hosteller" },
  { id: "other", label: "Other" },
];
const PRIOS = ["Food", "Budget", "Study", "Transport", "Laundry", "Roommates", "Shopping", "Utilities"];

export default function HostelOnboardingPage() {
  const [step, setStep] = useState(0);
  const [living, setLiving] = useState<LivingType>("hostel");
  const [locality, setLocality] = useState("");
  const [place, setPlace] = useState("");
  const [budget, setBudget] = useState("");
  const [prios, setPrios] = useState<string[]>(["Food", "Study"]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUid(user.id);
      const existing = await fetchHostelProfile(user.id);
      if (existing) {
        setLiving((existing.living_type as LivingType) || "hostel");
        setLocality(existing.locality || "");
        setPlace(existing.place_name || "");
        setBudget(existing.budget || "");
        if (existing.priorities?.length) setPrios(existing.priorities);
      }
    })();
  }, [router]);

  function togglePrio(p: string) {
    setPrios((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].slice(0, 5)));
  }

  async function finish() {
    if (!uid) return;
    setSaving(true);
    setErr("");
    const res = await saveHostelProfile(uid, {
      living_type: living,
      campus: "BMSCE",
      locality: locality || "Bull Temple / campus area",
      place_name: place,
      budget: budget || undefined,
      priorities: prios,
    });
    setSaving(false);
    if (!res.ok) { setErr(res.error || "Could not save"); return; }
    router.replace("/hostel");
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/explore" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Hostel setup</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Step {step + 1} of 3 · under 1 minute</p>
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
        {step === 0 && (
          <>
            <h1 className="h1" style={{ fontSize: 22, marginBottom: 8 }}>Where do you stay?</h1>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>No exact address — just enough to personalize.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {LIVING.map((l) => (
                <button key={l.id} type="button" className={living === l.id ? "chip on" : "chip"} onClick={() => setLiving(l.id)}>{l.label}</button>
              ))}
            </div>
            <button type="button" className="btn" style={{ width: "100%" }} onClick={() => setStep(1)}>Continue</button>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="h1" style={{ fontSize: 22, marginBottom: 8 }}>Locality</h1>
            <input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="e.g. Basavanagudi, BT Road" style={{ marginBottom: 10 }} />
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Hostel / PG name (optional)" style={{ marginBottom: 10 }} />
            <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Monthly budget (optional)" style={{ marginBottom: 14 }} />
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={() => setStep(0)}>Back</button>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setStep(2)}>Continue</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="h1" style={{ fontSize: 22, marginBottom: 8 }}>What matters most?</h1>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Pick up to 5</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {PRIOS.map((p) => (
                <button key={p} type="button" className={prios.includes(p) ? "chip on" : "chip"} onClick={() => togglePrio(p)}>{p}</button>
              ))}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn" style={{ flex: 1 }} disabled={saving} onClick={finish}>{saving ? "Saving…" : "Open Hostel hub"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
