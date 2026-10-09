"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, yearToLabel, isSuperAdmin } from "@/lib/supabase";
import { hasActiveMembership } from "@/lib/membership";
import { fetchSparksDeck, sparkSwipe } from "@/lib/sparks";
import { isDatingAppActive } from "@/lib/features";
import { GROWTH } from "@/lib/growth";
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
  const [killed, setKilled] = useState(false);
  const router = useRouter();

  async function gate(uid: string, em?: string | null) {
    const ok =
      GROWTH.sparksFree ||
      isSuperAdmin(em) ||
      (await hasActiveMembership(uid, "sparks"));
    setPaid(ok);
    return ok;
  }

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
    const target = deck[idx];
    const res = await sparkSwipe(userId, target.user_id || target.id, liked);
    if (res.matched) setMatchFlash(displayName(target) || "Match");
    setIdx((i) => i + 1);
    setMsg(liked ? "Liked" : "Passed");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
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

  if (!paid) {
    return (
      <div className="shell">
        <SparksNav />
        <div className="page">
          <Paywall product="sparks" />
        </div>
      </div>
    );
  }

  const card = deck[idx];

  return (
    <div className="shell">
      <SparksNav />
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
        {matchFlash && (
          <div className="ok" style={{ marginBottom: 8, fontWeight: 800 }}>It&apos;s a match with {matchFlash}!</div>
        )}
        {!card && (
          <div className="card">
            <p className="muted">No more profiles right now. Update /sparks/me or invite classmates.</p>
            <Link href="/sparks/me" className="btn btn-sm" style={{ marginTop: 10 }}>Edit Sparks profile</Link>
          </div>
        )}
        {card && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{
              height: 220, borderRadius: 16, marginBottom: 12,
              background: card.avatar_url ? `url(${card.avatar_url}) center/cover` : "var(--grad-cool)",
            }} />
            <div style={{ fontWeight: 800, fontSize: 18 }}>{displayName(card)}</div>
            <p className="muted" style={{ fontSize: 13 }}>
              {[yearToLabel(card.year), card.department].filter(Boolean).join(" · ")}
            </p>
            {card.bio && <p style={{ marginTop: 8, fontSize: 14 }}>{card.bio}</p>}
            <div className="row" style={{ gap: 10, marginTop: 14 }}>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => swipe(false)}>Pass</button>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={() => swipe(true)}>Like</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
