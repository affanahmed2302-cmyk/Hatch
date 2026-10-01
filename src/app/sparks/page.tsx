"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel, isSuperAdmin } from "@/lib/supabase";
import { hasActiveMembership } from "@/lib/membership";
import { fetchSparksDeck, sparkSwipe } from "@/lib/sparks";
import Paywall from "@/components/Paywall";
import SparksNav from "@/components/SparksNav";

export default function SparksDiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [paid, setPaid] = useState(false);
  const [deck, setDeck] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState("");
  const [matchFlash, setMatchFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function gate(uid: string, em?: string | null) {
    const ok = isSuperAdmin(em) || (await hasActiveMembership(uid, "sparks"));
    setPaid(ok);
    return ok;
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      const ok = await gate(user.id, user.email);
      if (ok) {
        const { data: mine } = await supabase.from("sparks_profiles").select("consent_at").eq("user_id", user.id).maybeSingle();
        if (!mine?.consent_at && !isSuperAdmin(user.email)) {
          router.replace("/sparks/me");
          return;
        }
        setDeck(await fetchSparksDeck(user.id));
      }
      setLoading(false);
    })();
  }, [router]);

  async function swipe(liked: boolean) {
    if (!userId || !deck[idx]) return;
    const card = deck[idx];
    const res = await sparkSwipe(userId, card.user_id, liked);
    if (!res.ok) {
      setMsg(res.error || "Run hatch_sparks_clubs.sql");
      return;
    }
    if (res.matched) {
      setMatchFlash(displayName(card.profile || {}));
      setTimeout(() => setMatchFlash(null), 2200);
    }
    setIdx((i) => i + 1);
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">Sparks…</span></div>;
  }

  if (!paid) {
    return (
      <div className="shell" style={{ background: "#0a0610" }}>
        <div className="topbar" style={{ background: "linear-gradient(90deg,#be185d,#7c3aed)", border: "none" }}>
          <Link href="/home" className="btn-ghost btn-sm" style={{ color: "#fff" }}>Campus</Link>
          <div style={{ fontWeight: 900, color: "#fff" }}>Campus Sparks</div>
        </div>
        <div className="page">
          <div className="card" style={{ marginBottom: 12, background: "linear-gradient(135deg,rgba(236,72,153,0.2),rgba(124,58,237,0.15))" }}>
            <div style={{ fontWeight: 900, fontSize: 22 }}>Dating for BMSCE</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
              Swipe students from your campus network. Matches open real chat.
              Built for college — year, dept, hostel vibes. Not a random public app.
            </p>
          </div>
          {userId && (
            <Paywall
              product="sparks"
              userId={userId}
              bullets={[
                "Unlimited Discover swipes",
                "See who liked you",
                "Matches → Hatch chat",
                "Campus-only profiles",
                "Cancel anytime · ₹150/month",
              ]}
              onUnlocked={async () => {
                if (userId) {
                  await gate(userId, email);
                  setDeck(await fetchSparksDeck(userId));
                }
              }}
            />
          )}
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
            <p className="muted" style={{ fontSize: 13 }}>Update your Sparks profile or check Likes</p>
            <Link href="/sparks/me" className="btn" style={{ marginTop: 12 }}>Edit profile</Link>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14, border: "1px solid rgba(244,114,182,0.35)" }}>
            <div style={{
              height: 300,
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
              {card.vibe && <p className="muted" style={{ fontSize: 13 }}>Vibe · {card.vibe}</p>}
              {card.looking_for && <p className="muted" style={{ fontSize: 13 }}>Looking · {card.looking_for}</p>}
              {card.meet_pref && <p className="muted" style={{ fontSize: 13 }}>Meetup · {card.meet_pref}</p>}
              {card.prompts && <p style={{ fontSize: 13, marginTop: 8 }}>{card.prompts}</p>}
            </div>
          </div>
        )}
        {card && (
          <div className="row" style={{ gap: 16, justifyContent: "center" }}>
            <button className="btn-ghost" style={{ width: 64, height: 64, borderRadius: "50%", fontSize: 24 }} onClick={() => swipe(false)}>✕</button>
            <button className="btn" style={{
              width: 72, height: 72, borderRadius: "50%", fontSize: 28,
              background: "linear-gradient(135deg,#ec4899,#a855f7)",
            }} onClick={() => swipe(true)}>♥</button>
          </div>
        )}
      </div>
      <SparksNav />
    </div>
  );
}
