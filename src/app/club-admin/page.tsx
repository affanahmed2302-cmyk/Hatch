"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin, displayName } from "@/lib/supabase";
import { isClubCore, requestClubCore, publishClubEvent, fetchFeedEvents } from "@/lib/clubCore";
import Nav from "@/components/Nav";

export default function ClubAdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
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
      const core = await isClubCore(user.id);
      setAllowed(core || isSuperAdmin(user.email));
      setEvents(await fetchFeedEvents(20));
      setLoading(false);
    })();
  }, [router]);

  async function applyCore() {
    if (!userId) return;
    const res = await requestClubCore(userId, clubName);
    if (!res.ok) setErr(res.error || "Failed — run hatch_hub.sql");
    else { setMsg("Request sent · super-admin must verify"); setErr(""); }
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
      setMsg("Event published to campus feed");
      setTitle(""); setBody(""); setVenue(""); setEventAt("");
      setEvents(await fetchFeedEvents(20));
    }
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/settings" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 14 }}>Club Core</div>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        {!allowed ? (
          <div className="card stack">
            <div className="h2">Become club core</div>
            <p className="muted" style={{ fontSize: 12 }}>
              Verified organizers can schedule events and push updates to Hatch Home.
            </p>
            <input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Club name e.g. Coding Club" />
            <button className="btn" onClick={applyCore}>Request access</button>
            <p className="muted" style={{ fontSize: 11 }}>Super-admin verifies in Admin switchboard</p>
          </div>
        ) : (
          <>
            <div className="card stack" style={{ marginBottom: 12 }}>
              <div className="h2">Publish event → feed</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" maxLength={120} />
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Short description" maxLength={400} />
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue" />
              <input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} />
              <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget ₹ (optional)" />
              <button className="btn" onClick={publish}>Publish to Home feed</button>
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
