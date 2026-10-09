"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  fetchSchedule,
  addScheduleItem,
  deleteScheduleItem,
  itemsForDay,
  upcomingGoals,
  buildIcs,
  downloadIcs,
  armReminders,
  DAY_LABELS,
  DAY_FULL,
  type ScheduleItem,
  type ScheduleKind,
} from "@/lib/schedule";
import { ensureNotifyPermission, notifyUser } from "@/lib/notify";
import Nav from "@/components/Nav";

const SUBJECT_HINTS = ["Maths", "Physics", "Chemistry", "DSA", "DBMS", "OS", "Networks", "English", "Lab"];
const ACTIVITY_HINTS = ["Gym", "Breakfast", "Lunch", "Dinner", "Study block", "Club meet", "Travel", "Sleep"];
const GOAL_HINTS = ["Finish assignment", "Revise for CIE", "Apply internship", "Project milestone"];

export default function SchedulePage() {
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState("Student");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "week" | "add" | "goals">("today");
  const [kind, setKind] = useState<ScheduleKind>("class");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [location, setLocation] = useState("");
  const [dow, setDow] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [due, setDue] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [notifyOn, setNotifyOn] = useState(false);
  const router = useRouter();

  const today = new Date().getDay();

  async function reload(userId: string) {
    const list = await fetchSchedule(userId);
    setItems(list);
    if (Notification.permission === "granted") {
      armReminders(list, (t, b) => notifyUser(t, b, { url: "/schedule", tag: "schedule" }));
    }
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUid(user.id);
      const { data: prof } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
      setName(prof?.full_name || prof?.username || "Student");
      await reload(user.id);
      setNotifyOn(Notification.permission === "granted");
      setLoading(false);
    })();
  }, [router]);

  const todayItems = useMemo(() => itemsForDay(items, today), [items, today]);
  const goals = useMemo(() => upcomingGoals(items), [items]);

  async function enableNotify() {
    const p = await ensureNotifyPermission();
    setNotifyOn(p === "granted");
    if (p === "granted" && uid) {
      setMsg("Reminders on — we'll ping 10 min before (when app is open / installed)");
      await reload(uid);
    } else if (p === "denied") {
      setErr("Notifications blocked — allow them in browser settings, or use Google Calendar export");
    }
  }

  async function save() {
    if (!uid) return;
    setErr("");
    if (!title.trim()) { setErr("Add a title"); return; }
    const payload: any = { kind, title, subtitle, location, remind_minutes: 10 };
    if (kind === "goal") {
      if (!due) { setErr("Pick a due date/time for the goal"); return; }
      payload.due_at = new Date(due).toISOString();
    } else {
      payload.day_of_week = dow;
      payload.start_time = start;
      payload.end_time = end;
    }
    const res = await addScheduleItem(uid, payload);
    if (!res.ok) { setErr(res.error || "Could not save"); return; }
    setTitle("");
    setSubtitle("");
    setLocation("");
    setMsg(kind === "goal" ? "Goal added" : "Added to your timetable");
    setTab(kind === "goal" ? "goals" : "today");
    await reload(uid);
  }

  async function remove(id: string) {
    if (!uid || !confirm("Remove this?")) return;
    await deleteScheduleItem(id, uid);
    await reload(uid);
    setMsg("Removed");
  }

  function exportCalendar() {
    if (!items.length) { setErr("Add classes or goals first"); return; }
    const ics = buildIcs(items, name);
    downloadIcs(ics, "hatch-schedule.ics");
    setMsg("Downloaded .ics — open it or Import into Google Calendar (Settings → Import)");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading schedule…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/explore" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Schedule</div>
        <button type="button" className="btn-ghost btn-sm" onClick={exportCalendar}>Export</button>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card" style={{ marginBottom: 14, background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(16,185,129,0.12))" }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Your discipline hub</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Classes · activities · goals → one timetable. Export to Google Calendar for phone alarms 10 min early.
          </p>
          <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sm" onClick={enableNotify}>
              {notifyOn ? "Reminders on ✓" : "Enable 10-min reminders"}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={exportCalendar}>Google Calendar .ics</button>
          </div>
        </div>

        <div className="row" style={{ gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {(["today", "week", "goals", "add"] as const).map((t) => (
            <button key={t} type="button" className={tab === t ? "chip on" : "chip"} onClick={() => setTab(t)}>
              {t === "add" ? "+ Add" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "today" && (
          <>
            <div className="section-label">{DAY_FULL[today]} · today</div>
            {!todayItems.length && (
              <div className="card" style={{ marginBottom: 12 }}>
                <p className="muted" style={{ fontSize: 13 }}>Nothing scheduled today. Add classes or activities.</p>
                <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setTab("add")}>Add class</button>
              </div>
            )}
            {todayItems.map((it) => (
              <div key={it.id} className="card" style={{ marginBottom: 10, borderLeft: `3px solid ${it.color || "#8b5cf6"}` }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge">{it.kind}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{it.start_time}{it.end_time ? `–${it.end_time}` : ""}</span>
                </div>
                <div style={{ fontWeight: 800, marginTop: 6 }}>{it.title}</div>
                {(it.subtitle || it.location) && (
                  <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {[it.subtitle, it.location].filter(Boolean).join(" · ")}
                  </p>
                )}
                <button type="button" className="btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => remove(it.id)}>Remove</button>
              </div>
            ))}
            {goals.slice(0, 3).length > 0 && (
              <>
                <div className="section-label">Upcoming goals</div>
                {goals.slice(0, 3).map((g) => (
                  <div key={g.id} className="card" style={{ marginBottom: 8, borderLeft: "3px solid #f59e0b" }}>
                    <div style={{ fontWeight: 700 }}>{g.title}</div>
                    <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Due {g.due_at ? new Date(g.due_at).toLocaleString() : ""}
                    </p>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === "week" && (
          <>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const list = itemsForDay(items, d);
              if (!list.length) return null;
              return (
                <div key={d} style={{ marginBottom: 14 }}>
                  <div className="section-label">{DAY_FULL[d]}{d === today ? " · today" : ""}</div>
                  {list.map((it) => (
                    <div key={it.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <strong style={{ fontSize: 14 }}>{it.title}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>{it.start_time}–{it.end_time || "?"}</span>
                      </div>
                      {it.location && <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>{it.location}</p>}
                    </div>
                  ))}
                </div>
              );
            })}
            {!items.filter((i) => i.kind !== "goal").length && (
              <p className="muted">No weekly classes yet — use + Add</p>
            )}
          </>
        )}

        {tab === "goals" && (
          <>
            <div className="section-label">Goals & deadlines</div>
            {!goals.length && <p className="muted" style={{ marginBottom: 12 }}>No goals — add CIE deadlines, projects, applications.</p>}
            {goals.map((g) => (
              <div key={g.id} className="card" style={{ marginBottom: 10, borderLeft: "3px solid #f59e0b" }}>
                <div style={{ fontWeight: 800 }}>{g.title}</div>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {g.due_at ? new Date(g.due_at).toLocaleString() : ""}
                </p>
                {g.notes && <p style={{ fontSize: 13, marginTop: 4 }}>{g.notes}</p>}
                <button type="button" className="btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => remove(g.id)}>Done / remove</button>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={() => { setKind("goal"); setTab("add"); }}>Add goal</button>
          </>
        )}

        {tab === "add" && (
          <div className="card">
            <div className="row" style={{ gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {(["class", "activity", "goal"] as ScheduleKind[]).map((k) => (
                <button key={k} type="button" className={kind === k ? "chip on" : "chip"} onClick={() => setKind(k)}>
                  {k}
                </button>
              ))}
            </div>

            <input
              placeholder={kind === "class" ? "Subject name" : kind === "goal" ? "Goal title" : "Activity name"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {(kind === "class" ? SUBJECT_HINTS : kind === "goal" ? GOAL_HINTS : ACTIVITY_HINTS).map((h) => (
                <button key={h} type="button" className="chip" style={{ fontSize: 11 }} onClick={() => setTitle(h)}>{h}</button>
              ))}
            </div>

            {kind !== "goal" && (
              <>
                <input placeholder="Faculty / notes (optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} style={{ marginBottom: 8 }} />
                <input placeholder="Room / place (e.g. C-301, Library)" value={location} onChange={(e) => setLocation(e.target.value)} style={{ marginBottom: 8 }} />
                <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Day</p>
                <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {DAY_LABELS.map((lab, i) => (
                    <button key={lab} type="button" className={dow === i ? "chip on" : "chip"} onClick={() => setDow(i)}>{lab}</button>
                  ))}
                </div>
                <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p className="muted" style={{ fontSize: 11 }}>Start</p>
                    <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="muted" style={{ fontSize: 11 }}>End</p>
                    <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {kind === "goal" && (
              <div style={{ marginBottom: 10 }}>
                <p className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Due date & time</p>
                <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
            )}

            <p className="muted" style={{ fontSize: 11, marginBottom: 10 }}>Reminder: 10 minutes before (in-app + Google Calendar after export)</p>
            <button type="button" className="btn" style={{ width: "100%" }} onClick={save}>
              Save {kind}
            </button>
          </div>
        )}

        <div className="card" style={{ marginTop: 16, opacity: 0.95 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>How notifications work</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            1. Tap <strong>Enable 10-min reminders</strong> for browser/PWA alerts when Hatch is installed or open.{" "}
            2. Tap <strong>Google Calendar .ics</strong> → open the file or Google Calendar → Settings → Import & export → Import.{" "}
            Calendar will alert you 10 min before every class even if Hatch is closed.
          </p>
        </div>

        <Link href="/explore" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 12 }}>← More tools</Link>
      </div>
      <Nav />
    </div>
  );
}
