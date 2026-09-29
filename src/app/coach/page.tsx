"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isProfileComplete } from "@/lib/supabase";
import {
  generateGoalPlan, downloadIcs, loadSavedGoal, saveGoal, updateChecklist,
  type GoalPlan, type SavedGoal,
} from "@/lib/coach";
import Nav from "@/components/Nav";

export default function CoachPage() {
  const [goalInput, setGoalInput] = useState("");
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [popup, setPopup] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const complete = await isProfileComplete(user.id);
      if (!complete.ok) {
        if (complete.missing.includes("terms")) router.replace("/terms");
        else router.replace("/onboarding");
        return;
      }
      const g = loadSavedGoal();
      if (g) {
        setPlan(g.plan);
        setChecklist(g.checklistDone || {});
        setGoalInput(g.goal);
      }
      const today = new Date().toDateString();
      const seen = localStorage.getItem("hatch_coach_popup_day");
      if (g && seen !== today) {
        setPopup("Coach reminder: hit today checklist for \"" + g.plan.title + "\". " + g.plan.dailyMinutes + " min focus.");
        localStorage.setItem("hatch_coach_popup_day", today);
      }
      setLoading(false);
    })();
  }, [router]);

  function build() {
    if (goalInput.trim().length < 8) {
      setMsg("Describe your goal in more detail (min 8 chars)");
      return;
    }
    const p = generateGoalPlan(goalInput);
    setPlan(p);
    saveGoal(goalInput, p);
    setChecklist({});
    setMsg("Plan ready");
    setPopup("New plan locked: " + p.title + ". Daily target ~" + p.dailyMinutes + " minutes.");
  }

  function toggleItem(key: string) {
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);
    updateChecklist(next);
  }

  function exportCal() {
    if (!plan) return;
    downloadIcs(plan);
    setMsg("Downloaded hatch-coach-plan.ics");
    setPopup("Open Google Calendar → Settings → Import → select the .ics file.");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading coach...</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">HATCH</div>
        <span className="badge" style={{ marginLeft: "auto" }}>Coach</span>
      </div>

      {popup && (
        <div style={{
          position: "fixed", top: 56, left: "50%", transform: "translateX(-50%)",
          width: "min(420px, calc(100% - 24px))", zIndex: 50,
          background: "rgba(20,20,30,0.95)", border: "1px solid rgba(139,92,246,0.4)",
          borderRadius: 14, padding: "12px 14px", boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
            <p style={{ fontSize: 13, lineHeight: 1.4, flex: 1 }}>{popup}</p>
            <button className="btn-ghost btn-sm" onClick={() => setPopup(null)}>OK</button>
          </div>
        </div>
      )}

      <div className="page">
        <h1 className="h1" style={{ fontSize: 24, marginBottom: 6 }}>Goal coach</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.45 }}>
          Tell the coach what you want. It builds a phased plan, daily checklist, and calendar blocks.
        </p>
        {msg && <div className="ok" style={{ marginBottom: 12 }}>{msg}</div>}

        <div className="card stack" style={{ marginBottom: 16 }}>
          <span className="label">Your goal</span>
          <textarea
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            rows={3}
            placeholder="Example: Crack JP Morgan internship in 2nd year / FAANG SDE intern / CAT 2027"
          />
          <button className="btn" onClick={build}>Generate best path</button>
        </div>

        {plan && (
          <>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="h2" style={{ marginBottom: 6 }}>{plan.title}</div>
              <p style={{ fontSize: 14, lineHeight: 1.45, marginBottom: 10 }}>{plan.summary}</p>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <span className="badge">{plan.timelineWeeks} weeks</span>
                <span className="badge">~{plan.dailyMinutes} min/day</span>
              </div>
            </div>

            <div className="card stack" style={{ marginBottom: 14 }}>
              <div className="h2">Today checklist</div>
              {plan.dailyChecklist.map((t, i) => {
                const key = "d-" + i;
                return (
                  <label key={key} className="row" style={{ gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!checklist[key]} onChange={() => toggleItem(key)} />
                    <span style={{ fontSize: 14 }}>{t}</span>
                  </label>
                );
              })}
            </div>

            <h2 className="h2" style={{ marginBottom: 10 }}>Phases</h2>
            {plan.phases.map((ph, idx) => (
              <div key={idx} className="card" style={{ marginBottom: 10 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="h2" style={{ fontSize: 15 }}>{ph.name}</div>
                  <span className="badge">W {ph.weeks}</span>
                </div>
                <p className="muted" style={{ fontSize: 12, margin: "6px 0" }}>{ph.focus}</p>
                <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                  {ph.tasks.map((t, j) => <li key={j}>{t}</li>)}
                </ul>
              </div>
            ))}

            <div className="card stack" style={{ marginBottom: 14 }}>
              <div className="h2">Weekly milestones</div>
              {plan.weeklyMilestones.map((m, i) => (
                <p key={i} style={{ fontSize: 13 }}>• {m}</p>
              ))}
            </div>

            <div className="card stack" style={{ marginBottom: 14 }}>
              <div className="h2">Resources</div>
              {plan.resources.map((r, i) => (
                <div key={i}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
                  <p className="muted" style={{ fontSize: 12 }}>{r.tip}</p>
                </div>
              ))}
            </div>

            <div className="card stack" style={{ marginBottom: 14 }}>
              <div className="h2">Calendar</div>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                Export an .ics file and import into Google Calendar.
              </p>
              {plan.calendarBlocks.map((b, i) => (
                <p key={i} style={{ fontSize: 13 }}>
                  {b.title} · {b.hour}:00 · {b.durationMin}m · {b.days}
                </p>
              ))}
              <button className="btn" onClick={exportCal}>Add to Google Calendar (.ics)</button>
              <p className="muted" style={{ fontSize: 11 }}>
                Google Calendar → gear → Import and export → Import → choose the file
              </p>
            </div>

            <Link href="/teams" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 20 }}>
              Find accountability teammates
            </Link>
          </>
        )}
      </div>
      <Nav />
    </div>
  );
}
