"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName } from "@/lib/supabase";
import {
  fetchHostelProfile,
  fetchHostelRequests,
  fetchHostelListings,
} from "@/lib/hostel";
import Nav from "@/components/Nav";

/**
 * Hostel life — real needs: food runs, late hangouts, room help, borrow gear.
 * Not a calculator. Engineering hostel energy.
 */
export default function HostelPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [reqs, setReqs] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      setUid(user.id);
      const hp = await fetchHostelProfile(user.id);
      if (hp && !hp.onboarded_at) {
        // soft: still show board without forcing long onboarding
      }
      setReqs(await fetchHostelRequests(30));
      setListings(await fetchHostelListings(20));
      setLoading(false);
    })();
  }, [router]);

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
        <Link href="/home" className="btn-ghost btn-sm">
          ←
        </Link>
        <div className="logo" style={{ fontSize: 16 }}>
          Hostel life
        </div>
        <Link href="/hostel/post" className="btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
          + Post
        </Link>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.45 }}>
          Food runs, late-night hangouts, borrow a drafter, find a wing for chai — what hostel actually is.
        </p>

        <div className="section-label">Needs right now</div>
        {reqs.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title || r.body || r.content}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {displayName(r.profile || {})} · {r.locality || "Hostel"}
            </p>
            {r.user_id && r.user_id !== uid && (
              <Link
                href={`/chat/${r.user_id}?ctx=${encodeURIComponent("Hostel: " + (r.title || r.body || "").slice(0, 80))}`}
                className="btn btn-sm"
                style={{ marginTop: 8 }}
              >
                Message
              </Link>
            )}
          </div>
        ))}
        {!reqs.length && (
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            No open needs — post "anyone for canteen?" or "need notes"
          </p>
        )}

        <div className="section-label">Share / lend</div>
        {listings.map((l) => (
          <div key={l.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{l.title || l.body}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {displayName(l.profile || {})}
            </p>
            {l.user_id && l.user_id !== uid && (
              <Link href={"/chat/" + l.user_id} className="btn btn-sm" style={{ marginTop: 8 }}>
                Message
              </Link>
            )}
          </div>
        ))}
        {!listings.length && (
          <p className="muted" style={{ fontSize: 13 }}>
            Nothing listed — lend a calculator, cycle, or lab coat when you can
          </p>
        )}

        <div style={{ height: 88 }} />
      </div>
      <Nav />
    </div>
  );
}
