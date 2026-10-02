"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel, isRecentlyOnline } from "@/lib/supabase";
import { recordProfileView, haptic } from "@/lib/obsession";
import { blockUser, reportUser } from "@/lib/safety";
import Nav from "@/components/Nav";

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [me, setMe] = useState<string | null>(null);
  const [p, setP] = useState<any>(null);
  const [certs, setCerts] = useState<any[]>([]);
  const [menu, setMenu] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMe(user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setP(data);
      const { data: c } = await supabase.from("certificates").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(12);
      setCerts(c || []);
      if (user.id !== id) recordProfileView(user.id, id);
      setLoading(false);
    })();
  }, [id, router]);

  async function connect() {
    if (!me || !id || me === id) return;
    const { error } = await supabase.from("connections").insert({
      user_id: me, target_id: id, status: "pending",
    });
    setMsg(error ? (error.message.includes("duplicate") ? "Already requested" : error.message) : "Request sent");
    haptic(12);
  }

  async function doBlock() {
    if (!me) return;
    if (!confirm("Block this person?")) return;
    await blockUser(me, id);
    setMsg("Blocked");
    setMenu(false);
    router.push("/discover");
  }

  async function doReport() {
    if (!me) return;
    await reportUser(me, id, "inappropriate");
    setMsg("Report submitted");
    setMenu(false);
  }

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: displayName(p || {}), url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      setMsg("Profile link copied");
    }
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Loading…</span></div>;
  }
  if (!p) {
    return (
      <div className="shell">
        <div className="page"><p className="muted">Profile not found</p><Link href="/discover" className="btn btn-sm">Back</Link></div>
        <Nav />
      </div>
    );
  }

  const mode = (p.profile_mode || "both") as string;
  const showSocial = mode === "social" || mode === "both" || me === id;
  const showPro = mode === "professional" || mode === "both" || me === id;

  const online = isRecentlyOnline(p.last_seen);
  const skills = Array.isArray(p.skills) ? p.skills : [];
  const strength = Math.min(100, [
    p.avatar_url ? 20 : 0,
    p.bio && String(p.bio).length >= 20 ? 20 : 0,
    p.department ? 10 : 0,
    p.career_goal ? 15 : 0,
    skills.length ? 15 : 0,
    p.github_handle ? 10 : 0,
    p.tech_stack ? 10 : 0,
  ].reduce((a, b) => a + b, 0));

  return (
    <div className="shell">
      <div className="topbar">
        <button className="btn-ghost btn-sm" onClick={() => router.back()}>←</button>
        <div className="logo" style={{ fontSize: 14 }}>Profile</div>
        <button className="btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={share}>Share</button>
        <div style={{ position: "relative" }}>
          <button className="btn-ghost btn-sm" onClick={() => setMenu(!menu)} aria-label="More">···</button>
          {menu && (
            <div className="card" style={{
              position: "absolute", right: 0, top: 36, zIndex: 50, minWidth: 180,
              padding: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}>
              <Link href={"/chat/" + id} className="btn-ghost btn-sm" style={{ display: "block", textAlign: "left", width: "100%" }} onClick={() => setMenu(false)}>Message</Link>
              <button className="btn-ghost btn-sm" style={{ display: "block", width: "100%", textAlign: "left" }} onClick={doReport}>Report</button>
              <button className="btn-ghost btn-sm" style={{ display: "block", width: "100%", textAlign: "left", color: "#f43f5e" }} onClick={doBlock}>Block</button>
            </div>
          )}
        </div>
      </div>

      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        <div className="card" style={{ marginBottom: 14, textAlign: "center", background: "linear-gradient(160deg,rgba(124,58,237,0.2),rgba(15,15,20,0.95))" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{
              width: 96, height: 96, borderRadius: "50%", margin: "0 auto",
              background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : "var(--grad-cool)",
              boxShadow: online ? "0 0 0 3px #34d399" : "0 0 0 3px rgba(139,92,246,0.4)",
            }} />
            {online && <span style={{ position: "absolute", bottom: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: "#34d399", border: "2px solid #0f0f14" }} />}
          </div>
          <h1 className="h1" style={{ fontSize: 22, marginTop: 12 }}>{displayName(p)}{p.is_verified ? " ✓" : ""}</h1>
          <p className="muted" style={{ fontSize: 13 }}>@{p.username || "—"} · {p.department || "BMS"}{p.year ? ` · ${yearToLabel(p.year)}` : ""}</p>
          <div className="row" style={{ justifyContent: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <span className="badge" style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)", color: "#fff" }}>Rep {p.rep_score || 0}</span>
            <span className="badge">Profile {strength}%</span>
            {mode !== "both" && me !== id && (
              <span className="badge">{mode === "professional" ? "Career view" : "Social view"}</span>
            )}
          </div>
        </div>

        {showSocial && p.bio && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="h2" style={{ fontSize: 14, marginBottom: 6 }}>About</div>
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>{p.bio}</p>
          </div>
        )}

        {showPro && (p.career_goal || p.intent || p.availability) && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="h2" style={{ fontSize: 14, marginBottom: 8 }}>Focus</div>
            {p.career_goal && <p style={{ fontSize: 13, marginBottom: 4 }}><span className="muted">Goal · </span>{p.career_goal}</p>}
            {p.intent && <p style={{ fontSize: 13, marginBottom: 4 }}><span className="muted">Looking for · </span>{p.intent}</p>}
            {p.availability && <p style={{ fontSize: 13 }}><span className="muted">Free · </span>{p.availability}</p>}
          </div>
        )}

        {showPro && (skills.length > 0 || p.tech_stack) && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="h2" style={{ fontSize: 14, marginBottom: 8 }}>Builder</div>
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {skills.map((s: string) => <span key={s} className="badge">{s}</span>)}
            </div>
            {p.tech_stack && <p className="muted" style={{ fontSize: 12 }}>{p.tech_stack}</p>}
          </div>
        )}

        {showPro && certs.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="h2" style={{ fontSize: 14, marginBottom: 8 }}>Certificates</div>
            {certs.map((c: any) => (
              <div key={c.id} style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</p>
                {c.issuer && <p className="muted" style={{ fontSize: 12 }}>{c.issuer}</p>}
                {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 12 }}>Open link</a>}
              </div>
            ))}
          </div>
        )}

        {showPro && (
          <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {p.github_handle && (
              <a className="btn-ghost btn-sm" href={`https://github.com/${p.github_handle}`} target="_blank" rel="noreferrer">GitHub</a>
            )}
            {p.leetcode_handle && (
              <a className="btn-ghost btn-sm" href={`https://leetcode.com/${p.leetcode_handle}`} target="_blank" rel="noreferrer">LeetCode</a>
            )}
            {p.linkedin_url && (
              <a className="btn-ghost btn-sm" href={p.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>
            )}
          </div>
        )}

        {!showPro && !showSocial && (
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Limited profile view</p>
        )}

        {me !== id && (
          <div className="row" style={{ gap: 10 }}>
            <button className="btn" style={{ flex: 1 }} onClick={connect}>Connect</button>
            <Link href={"/chat/" + id} className="btn-ghost" style={{ flex: 1, textAlign: "center", padding: "12px" }}>Message</Link>
          </div>
        )}
        {me === id && (
          <Link href="/profile" className="btn" style={{ display: "block", textAlign: "center" }}>Edit my profile</Link>
        )}
      </div>
      <Nav />
    </div>
  );
}
