"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, acceptTerms } from "@/lib/supabase";

export default function Terms() {
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  async function accept() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const res = await acceptTerms(user.id);
    if (!res.ok) { setErr(res.error || "Failed"); setLoading(false); return; }
    router.replace("/home");
  }

  return (
    <div className="shell" style={{ padding: 24 }}>
      <div className="logo" style={{ marginBottom: 16 }}>MESH</div>
      <h1 className="h1" style={{ marginBottom: 12 }}>Campus safety gate</h1>
      <div className="card stack" style={{ marginBottom: 16, maxHeight: 360, overflowY: "auto" }}>
        <div><strong>1. Real Identity</strong><p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>No fake names, burners, or catfishing. Profile must reflect real student identity.</p></div>
        <div><strong>2. Zero toxicity</strong><p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>No bullying, hate, stalking, or non-consensual sharing. Instant ban for violations.</p></div>
        <div><strong>3. Privacy</strong><p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>Messages and status stay within campus network. Delete follows privacy protocol.</p></div>
        <div><strong>4. Accountability</strong><p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>MESH cooperates with college admin if campus safety or law is breached.</p></div>
      </div>
      {err && <div className="fail" style={{ marginBottom: 12 }}>{err}</div>}
      <label className="row" style={{ marginBottom: 14, fontSize: 14 }}>
        <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} style={{ width: 18, height: 18 }} />
        I have read and accept these terms
      </label>
      <button className="btn" disabled={!ok || loading} onClick={accept} style={{ width: "100%" }}>
        {loading ? "…" : "Confirm & enter campus"}
      </button>
    </div>
  );
}
