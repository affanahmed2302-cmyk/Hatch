"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel, isSuperAdmin } from "@/lib/supabase";
import { isFeatureOn } from "@/lib/features";
import { fetchSparksDeck, sparkSwipe } from "@/lib/sparks";
import SparksNav from "@/components/SparksNav";

/** Full Sparks dating mini-app — Discover / swipe */
export default function SparksDiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [deck, setDeck] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState("");
  const [matchFlash, setMatchFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const on = await isFeatureOn("feature_sparks");
      const admin = isSuperAdmin(user.email);
      if (!on && !admin) { setAllowed(false); setLoading(false); return; }
      setAllowed(true);

      const { data: mine } = await supabase.from("sparks_profiles").select("consent_at").eq("user_id", user.id).maybeSingle();
      if (!mine?.consent_at && !admin) {
        router.replace("/sparks/me");
        return;
      }

      const cards = await fetchSparksDeck(user.id);
      setDeck(cards);
      setLoading(false);
    })();
  }, [router]);

  async function swipe(liked: boolean) {
    if (!userId || !deck[idx]) return;
    const card = deck[idx];
    const res = await sparkSwipe(userId, card.user_id, liked);
    if (!res.ok) {
      setMsg(res.error || "Swipe failed — run hatch_sparks_clubs.sql");
      return;
    }
    if (res.matched) {
      setMatchFlash(displayName(card.profile || {}));
      setTimeout(() => setMatchFlash(null), 2200);
    }
    setIdx((i) => i + 1);
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Opening Sparks…</span>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="shell">
        <div className="topbar"><div className="logo" style={{ fontSize: 14 }}>Sparks</div></div>
        <div className="page">
          <div className="card">
            <div className="h2">Secret module offline</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Admin has not enabled Campus Sparks yet.</p>
            <Link href="/home" className="btn" style={{ display: "block", textAlign: "center", marginTop: 12 }}>Back to campus</Link>
          </div>
        </div>
      </div>
    );
  }

  const card = deck[idx];

  return (
    <div className="shell" style={{ background: "#0a0610" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#be185d,#7c3aed)", border: "none" }}>
        <Link href="/home" className="btn-ghost btn-sm" style={{ color: "#fff" }}>Campus</Link>
        <div style={{ fontWeight: 900, color: "#fff", fontSize: 15 }}>Sparks</div>
        <Link href="/sparks/me" className="btn-ghost btn-sm" style={{ marginLeft: "auto", color: "#fff" }}>Profile</Link>
      </div>

      <div className="page" style={{ paddingBottom: 90 }}>
        {msg && <div className="fail" style={{ marginBottom: 10 }}>{msg}</div>}

        {matchFlash && (
          <div className="card" style={{
            marginBottom: 12, textAlign: "center",
            background: "linear-gradient(135deg,rgba(236,72,153,0.35),rgba(124,58,237,0.25))",
            border: "1px solid #f472b6",
          }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>It&apos;s a match!</div>
            <p className="muted" style={{ fontSize: 13 }}>You and {matchFlash}</p>
            <Link href="/sparks/matches" className="btn btn-sm" style={{ marginTop: 8 }}>See matches</Link>
          </div>
        )}

        {!card ? (
          <div className="empty" style={{ padding: 40 }}>
            <p style={{ fontWeight: 800 }}>No more profiles</p>
            <p className="muted" style={{ fontSize: 13 }}>Check Likes or update your Sparks profile</p>
            <Link href="/sparks/me" className="btn" style={{ marginTop: 12 }}>Edit profile</Link>
          </div>
        ) : (
          <div className="card" style={{
            padding: 0, overflow: "hidden", marginBottom: 14,
            border: "1px solid rgba(244,114,182,0.35)",
          }}>
            <div style={{
              height: 280,
              background: card.profile?.avatar_url
                ? `url(${card.profile.avatar_url}) center/cover`
                : "linear-gradient(160deg,#be185d,#4c1d95)",
            }} />
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 22 }}>{displayName(card.profile || {})}</div>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {card.profile?.department}
                {card.profile?.year ? ` · ${yearToLabel(card.profile.year)}` : ""}
              </p>
              {card.headline && <p style={{ fontSize: 15, marginTop: 10, fontWeight: 600 }}>{card.headline}</p>}
              {card.vibe && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Vibe · {card.vibe}</p>}
              {card.looking_for && <p className="muted" style={{ fontSize: 13 }}>Looking · {card.looking_for}</p>}
              {card.prompts && <p style={{ fontSize: 13, marginTop: 8 }}>{card.prompts}</p>}
              {card.profile?.bio && (
                <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{String(card.profile.bio).slice(0, 160)}</p>
              )}
            </div>
          </div>
        )}

        {card && (
          <div className="row" style={{ gap: 16, justifyContent: "center" }}>
            <button
              className="btn-ghost"
              style={{ width: 64, height: 64, borderRadius: "50%", fontSize: 24 }}
              onClick={() => swipe(false)}
            >✕</button>
            <button
              className="btn"
              style={{
                width: 72, height: 72, borderRadius: "50%", fontSize: 28,
                background: "linear-gradient(135deg,#ec4899,#a855f7)",
              }}
              onClick={() => swipe(true)}
            >♥</button>
          </div>
        )}
      </div>
      <SparksNav />
    </div>
  );
}
