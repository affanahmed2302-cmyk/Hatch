"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import { fetchSparksDeck, sparkSwipe } from "@/lib/sparks";
import { isCirclesActive } from "@/lib/features";
import Nav from "@/components/Nav";

/** Campus Circles — classmate discovery for projects/study/fests (not dating UI) */
export default function CirclesPage() {
  const [on, setOn] = useState<boolean | null>(null);
  const [deck, setDeck] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [myId, setMyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setMyId(user.id);
      const active = await isCirclesActive();
      setOn(active);
      if (active) {
        setDeck(await fetchSparksDeck(user.id));
      }
    })();
  }, [router]);

  async function swipe(like: boolean) {
    if (!myId || !deck[idx]) return;
    const res = await sparkSwipe(myId, deck[idx].user_id || deck[idx].id, like);
    if (res?.matched) setMsg("It's a match — check Circles matches");
    setIdx((i) => i + 1);
  }

  if (on === null) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">…</span>
      </div>
    );
  }

  if (!on) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/more" className="btn-ghost btn-sm">
            ←
          </Link>
          <div className="logo" style={{ fontSize: 16 }}>
            Circles
          </div>
        </div>
        <div className="page" style={{ textAlign: "center", paddingTop: 48 }}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Circles is paused</div>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 16 }}>
            Campus Circles (classmate matching for projects &amp; study) is turned off by the founder.
            Use Discover and I&apos;m Free instead — or ask admin to enable <code>feature_sparks</code> in Pilot.
          </p>
          <Link href="/discover" className="btn">
            Open Discover
          </Link>
          <div style={{ marginTop: 12 }}>
            <Link href="/more" className="btn-ghost btn-sm">
              Back to More
            </Link>
          </div>
        </div>
        <Nav />
      </div>
    );
  }

  const card = deck[idx];

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/more" className="btn-ghost btn-sm">
          ←
        </Link>
        <div className="logo" style={{ fontSize: 16 }}>
          Circles
        </div>
        <Link href="/sparks/matches" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
          Matches
        </Link>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {!card ? (
          <div className="empty" style={{ padding: 32 }}>
            <p style={{ fontWeight: 700 }}>No more profiles</p>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              Check back later or edit your Circles profile
            </p>
            <Link href="/sparks/me" className="btn btn-sm" style={{ marginTop: 12 }}>
              Edit Circles profile
            </Link>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 16 }}>
            <div
              style={{
                height: 220,
                borderRadius: 16,
                marginBottom: 12,
                background: card.avatar_url || card.photo_url
                  ? `url(${card.avatar_url || card.photo_url}) center/cover`
                  : "linear-gradient(135deg,#8b5cf6,#ec4899)",
              }}
            />
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {displayName(card) || "Student"}
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {card.bio || card.intent || "Open to collaborate"}
            </p>
            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => swipe(false)}>
                Pass
              </button>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={() => swipe(true)}>
                Connect
              </button>
            </div>
          </div>
        )}
        <div style={{ height: 88 }} />
      </div>
      <Nav />
    </div>
  );
}
