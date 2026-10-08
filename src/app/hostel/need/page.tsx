"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import {
  createHostelRequest,
  fetchHostelRequests,
  addHostelTip,
  fetchHostelTips,
  fetchHostelProfile,
} from "@/lib/hostel";

const CATS = ["general", "food", "study", "laundry", "transport", "item", "other"];

export default function HostelNeedPage() {
  const [tab, setTab] = useState<"need" | "tips">("need");
  const [cat, setCat] = useState("general");
  const [body, setBody] = useState("");
  const [budget, setBudget] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [tipTitle, setTipTitle] = useState("");
  const [tipBody, setTipBody] = useState("");
  const [locality, setLocality] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("tab") === "tips") setTab("tips");
    } catch { /* */ }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUid(user.id);
      const hp = await fetchHostelProfile(user.id);
      setLocality(hp?.locality || "");
      setList(await fetchHostelRequests(30));
      setTips(await fetchHostelTips(hp?.locality));
    })();
  }, [router]);

  async function postNeed() {
    if (!uid) return;
    setErr("");
    const res = await createHostelRequest(uid, {
      category: cat,
      body,
      locality,
      budget: budget || undefined,
      hours: 48,
    });
    if (!res.ok) { setErr(res.error || "Failed"); return; }
    setBody("");
    setMsg("Request posted");
    setList(await fetchHostelRequests(30));
  }

  async function postTip() {
    if (!uid) return;
    const res = await addHostelTip(uid, { title: tipTitle, body: tipBody, locality, tag: "local" });
    if (!res.ok) { setErr(res.error || "Failed"); return; }
    setTipTitle("");
    setTipBody("");
    setMsg("Tip added");
    setTips(await fetchHostelTips(locality));
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/hostel" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Need something</div>
      </div>
      <div className="page">
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button type="button" className={tab === "need" ? "chip on" : "chip"} onClick={() => setTab("need")}>Requests</button>
          <button type="button" className={tab === "tips" ? "chip on" : "chip"} onClick={() => setTab("tips")}>Local tips</button>
        </div>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        {tab === "need" && (
          <>
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Post a need</div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {CATS.map((c) => (
                  <button key={c} type="button" className={cat === c ? "chip on" : "chip"} onClick={() => setCat(c)}>{c}</button>
                ))}
              </div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Need calculator tomorrow" maxLength={280} rows={3} style={{ marginBottom: 8, width: "100%" }} />
              <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget (optional)" style={{ marginBottom: 8 }} />
              <button type="button" className="btn" style={{ width: "100%" }} disabled={!body.trim()} onClick={postNeed}>Post request</button>
            </div>
            {list.map((r) => (
              <div key={r.id} className="card" style={{ marginBottom: 10 }}>
                <span className="badge">{r.category}</span>
                <p style={{ marginTop: 8 }}>{r.body}</p>
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{displayName(r.profile || {})}</p>
                {r.user_id !== uid && (
                  <Link href={"/chat/" + r.user_id} className="btn btn-sm" style={{ marginTop: 8 }}>Chat</Link>
                )}
              </div>
            ))}
          </>
        )}

        {tab === "tips" && (
          <>
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Share a tip</div>
              <input value={tipTitle} onChange={(e) => setTipTitle(e.target.value)} placeholder="Title e.g. Cheap laundry" style={{ marginBottom: 8 }} />
              <textarea value={tipBody} onChange={(e) => setTipBody(e.target.value)} placeholder="Details" rows={3} style={{ marginBottom: 8, width: "100%" }} />
              <button type="button" className="btn" style={{ width: "100%" }} disabled={!tipTitle.trim() || !tipBody.trim()} onClick={postTip}>Add tip</button>
            </div>
            {tips.map((t) => (
              <div key={t.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{t.title}</div>
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t.body}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
