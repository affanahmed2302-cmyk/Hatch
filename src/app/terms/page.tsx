"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, acceptTerms } from "@/lib/supabase";

export default function TermsPage() {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("terms_accepted").eq("id", user.id).maybeSingle();
      if (data?.terms_accepted) { router.replace("/home"); return; }
      setLoading(false);
    })();
  }, [router]);

  async function accept() {
    if (!userId || !checked) return;
    setSaving(true); setErr("");
    const res = await acceptTerms(userId);
    setSaving(false);
    if (!res.ok) { setErr(res.error || "Failed"); return; }
    router.replace("/home");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="shell" style={{ padding: 24 }}>
      <div className="logo" style={{ marginBottom: 16 }}>HATCH</div>
      <h1 className="h1" style={{ marginBottom: 12 }}>Campus safety gate</h1>
      <div className="card" style={{ maxHeight: 320, overflowY: "auto", marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>
        <p style={{ marginBottom: 12 }}><strong>1. Real Identity Policy</strong><br />Hatch is exclusively for verified college students. No fake names, burner accounts, or catfishing.</p>
        <p style={{ marginBottom: 12 }}><strong>2. Zero-Toxicity</strong><br />Zero-tolerance for bullying, hate speech, or stalking. Violators are banned.</p>
        <p style={{ marginBottom: 12 }}><strong>3. Data & Privacy</strong><br />Messages and team data stay within the campus network.</p>
        <p><strong>4. Accountability</strong><br />Hatch cooperates with college administration if safety laws are breached.</p>
      </div>
      {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}
      <label className="row" style={{ marginBottom: 14, gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
        <span style={{ fontSize: 14 }}>I have read and accept these terms</span>
      </label>
      <button className="btn" style={{ width: "100%" }} disabled={!checked || saving} onClick={accept}>
        {saving ? "Saving…" : "Confirm & Enter Campus"}
      </button>
    </div>
  );
}
