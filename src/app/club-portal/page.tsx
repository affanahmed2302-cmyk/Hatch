"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import { isClubPortalActive } from "@/lib/features";
import { isClubCore, requestClubCore, publishClubEvent, fetchFeedEvents } from "@/lib/clubCore";
import Nav from "@/components/Nav";

/**
 * Sister App 2 — Club Onboarding & Event Management Portal
 * Gated by feature_club_portal kill-switch (+ verified club core / super-admin).
 */
export default function ClubPortalPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [portalOn, setPortalOn] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [clubName, setClubName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [venue, setVenue] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [budget, setBudget] = useState("0");
  const [events, setEvents] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      const on = await isClubPortalActive();
      setPortalOn(on);
      if (!on && !isSuperAdmin(user.email)) {
        setLoading(false);
        return;
      }
      const core = await isClubCore(user.id);
      setAllowed(core || isSuperAdmin(user.email));
      setEvents(await fetchFeedEvents(20));
      setLoading(false);
    })();
  }, [router]);

  async function applyCore() {
    if (!userId) return;
    const res = await requestClubCore(userId, clubName);
    if (!res.ok) setErr(res.error || "Failed — run hatch_sister_apps.sql");
    else { setMsg("Request sent · wait for CEO Pilot verify"); setErr(""); }
  }

  async function publish() {
    if (!userId) return;
    setErr("");
    const res = await publishClubEvent(userId, {
      title,
      body,
      venue,
      event_at: eventAt ? new Date(eventAt).toISOString() : undefined,
      budget_inr: parseInt(budget, 10) || 0,
      publish_to_feed: true,
    });
    if (!res.ok) setErr(res.error || "Publish failed");
    else {
      setMsg("Event live on Hatch Home feed");
      setTitle(""); setBody(""); setVenue(""); setEventAt("");
      setEvents(await fetchFeedEvents(20));
    }
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Club portal…</span>
      </div>
    );
  }

  if (!portalOn && !isSuperAdmin(email)) {
    return (
      <div className="shell">
        <div className="topbar"><div className="logo" style={{ fontSize: 14 }}>Club Portal</div></div>
        <div className="page">
          <div className="card">
            <div className="h2">Coming soon</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              Club organizer tools are offline. Check back later or use main Hatch clubs browse.
            </p>
            <Link href="/clubs" className="btn" style={{ display: "block", textAlign: "center", marginTop: 12 }}>Browse clubs</Link>
            <Link href="/home" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 8 }}>Campus Home</Link>
          </div>
        </div>
        <Nav />
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar" style={{ background: "linear-gradient(90deg,#0ea5e9,#6366f1)", border: "none" }}>
        <Link href="/home" className="btn-ghost btn-sm" style={{ color: "#fff" }}>Campus</Link>
        <div style={{ fontWeight: 900, color: "#fff", fontSize: 14 }}>Club Portal</div>
        {isSuperAdmin(email) && (
          <Link href="/clubs-hq" className="btn-ghost btn-sm" style={{ marginLeft: "auto", color: "#fff" }}>HQ</Link>
        )}
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        {!allowed ? (
          <div className="card stack">
            <div className="h2">Onboard as club core</div>
            <p className="muted" style={{ fontSize: 12 }}>
              Verified organizers schedule events that appear on every student&apos;s Hatch Home.
            </p>
            <input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Club name e.g. Coding Club" />
            <button className="btn" onClick={applyCore}>Request access</button>
            <p className="muted" style={{ fontSize: 11 }}>Super-admin verifies in Pilot</p>
          </div>
        ) : (
          <>
            <div className="card stack" style={{ marginBottom: 12 }}>
              <div className="h2">Schedule event → campus feed</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" maxLength={120} />
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Description" maxLength={400} />
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue" />
              <input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} />
              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget ₹" />
              <button className="btn" onClick={publish}>Publish to Hatch Home</button>
            </div>
            <div className="card">
              <div className="h2" style={{ marginBottom: 8 }}>Recent feed events</div>
              {events.map((ev) => (
                <div key={ev.id} style={{ marginBottom: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{ev.title}</div>
                  {ev.body && <p className="muted" style={{ fontSize: 12 }}>{ev.body}</p>}
                  {ev.venue && <p className="muted" style={{ fontSize: 11 }}>{ev.venue}</p>}
                </div>
              ))}
              {!events.length && <p className="muted" style={{ fontSize: 12 }}>No events yet</p>}
            </div>
          </>
        )}
      </div>
      <Nav />
    </div>
  );
}
