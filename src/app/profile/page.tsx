"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, saveProfile, isSuperAdmin } from "@/lib/supabase";
import { generateGoalPlan, downloadIcs, saveGoal } from "@/lib/coach";
import { hasChatLock, setChatLockPin, clearChatLock } from "@/lib/chatLock";
import { ensureInviteCode, inviteUrl } from "@/lib/safety";
import Nav from "@/components/Nav";
import Link from "next/link";

const DEPTS = ["CSE","ISE","ECE","EEE","ME","CV","AE","BT","AIML","AIDS","Other"];
const INTENTS = ["Internship","Hackathons","Study buddy","Project partner","Open source","Research","Placement","Startup"];

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [phone, setPhone] = useState("");
  const [github, setGithub] = useState("");
  const [leetcode, setLeetcode] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [techStack, setTechStack] = useState("");
  const [skills, setSkills] = useState("");
  const [goal, setGoal] = useState("");
  const [intent, setIntent] = useState("");
  const [availability, setAvailability] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rep, setRep] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachPlan, setCoachPlan] = useState<ReturnType<typeof generateGoalPlan> | null>(null);
  const [lockOn, setLockOn] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [invite, setInvite] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        setUserId(user.id);
        setEmail(user.email || "");
        setLockOn(hasChatLock());
        const code = await ensureInviteCode(user.id);
        setInvite(code);
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (data) {
          setFullName(data.full_name || "");
          setUsername(data.username || "");
          setBio(data.bio || "");
          setDepartment(data.department || "");
          setYear(data.year != null ? String(data.year) : "");
          setPhone(data.phone || "");
          setGithub(data.github_handle || "");
          setLeetcode(data.leetcode_handle || "");
          setLinkedin(data.linkedin_url || "");
          setTechStack(data.tech_stack || "");
          setSkills(Array.isArray(data.skills) ? data.skills.join(", ") : (data.skills || ""));
          setGoal(data.career_goal || "");
          setIntent(data.intent || "");
          setAvailability(data.availability || "");
          setAvatarUrl(data.avatar_url || null);
          setPreview(data.avatar_url || null);
          setRep(data.rep_score || 0);
        }
      } catch (e: any) {
        setErr(e?.message || "Load failed");
      }
      setLoading(false);
    })();
  }, [router]);

  function strength() {
    return Math.min(100, [
      preview || avatarUrl ? 20 : 0,
      bio.trim().length >= 20 ? 20 : 0,
      department ? 10 : 0,
      goal.trim() ? 15 : 0,
      skills.trim() ? 15 : 0,
      github.trim() ? 10 : 0,
      techStack.trim() ? 10 : 0,
    ].reduce((a, b) => a + b, 0));
  }

  function onPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Pick an image"); return; }
    if (f.size > 5 * 1024 * 1024) { setErr("Max 5MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setErr("");
  }

  async function uploadAvatar(uid: string): Promise<string | null> {
    if (!file) return avatarUrl;
    const ext = file.name.split(".").pop() || "jpg";
    const path = uid + "/avatar." + ext;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      if (error.message.includes("Bucket") || error.message.includes("not found"))
        throw new Error("Create public Storage bucket named avatars");
      throw new Error(error.message);
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    return pub.publicUrl;
  }

  async function save() {
    if (!userId) return;
    setIsSaving(true); setErr(""); setMsg("");
    try {
      if (fullName.trim().length < 2) { setErr("Full name required"); setIsSaving(false); return; }
      if (username.trim().length < 3) { setErr("Username min 3 chars"); setIsSaving(false); return; }
      if (bio.trim().length < 20) { setErr("Bio min 20 characters"); setIsSaving(false); return; }

      let url = avatarUrl;
      if (file) url = await uploadAvatar(userId);

      const skillList = skills.split(",").map(s => s.trim()).filter(Boolean).slice(0, 20);
      const res = await saveProfile(userId, {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        department: department || null,
        year: year || null,
        phone: phone.replace(/\D/g, "").slice(-10) || null,
        github_handle: github.trim().replace(/^@/, "") || null,
        leetcode_handle: leetcode.trim() || null,
        linkedin_url: linkedin.trim() || null,
        tech_stack: techStack.trim() || null,
        skills: skillList,
        career_goal: goal.trim() || null,
        intent: intent || null,
        availability: availability.trim() || null,
        avatar_url: url || null,
      });
      if (!res.ok) { setErr(res.error || "Save failed"); setIsSaving(false); return; }
      setAvatarUrl(url);
      setFile(null);
      setMsg("Profile saved · strength " + strength() + "%");

      const g = goal.trim() || bio.trim() || intent || "Grow skills in college";
      const plan = generateGoalPlan(g + (department ? " " + department : "") + (year ? " year " + year : ""));
      saveGoal(g, plan);
      setCoachPlan(plan);
      setCoachOpen(true);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    }
    setIsSaving(false);
  }

  function openCoach() {
    const g = goal.trim() || bio.trim() || "Campus growth";
    const plan = generateGoalPlan(g);
    setCoachPlan(plan);
    setCoachOpen(true);
    setSheet(false);
  }

  function enableLock() {
    if (newPin.length < 4) { setErr("PIN min 4 digits"); return; }
    setChatLockPin(newPin);
    setLockOn(true);
    setNewPin("");
    setMsg("Chat lock on");
  }

  function disableLock() {
    clearChatLock();
    setLockOn(false);
    setMsg("Chat lock off");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading...</span>
      </div>
    );
  }

  const pct = strength();

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">HATCH</div>
        <span className="badge" style={{ marginLeft: "auto", marginRight: 8 }}>Rep {rep}</span>
        <button
          className="btn-ghost btn-sm"
          onClick={() => setSheet(true)}
          aria-label="Settings"
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: "rgba(139,92,246,0.2)", fontSize: 18,
          }}
        >⚙️</button>
      </div>

      {/* Settings sheet */}
      {sheet && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 85, background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }} onClick={() => setSheet(false)}>
          <div className="card" style={{
            width: "min(440px, 100%)", maxHeight: "80dvh", overflowY: "auto",
            borderRadius: "20px 20px 0 0", margin: 0, padding: 16,
          }} onClick={e => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div className="h2">Tools & settings</div>
              <button className="btn-ghost btn-sm" onClick={() => setSheet(false)}>Close</button>
            </div>

            <button className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={openCoach}>🎯 Career guidance</button>
            <Link href="/coach" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }} onClick={() => setSheet(false)}>Full career coach</Link>
            <Link href="/leaderboard" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }} onClick={() => setSheet(false)}>🏆 Campus leaderboard</Link>
            <Link href="/saved" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }} onClick={() => setSheet(false)}>❤️ Saved people</Link>
            <Link href="/clubs" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }} onClick={() => setSheet(false)}>Clubs hub</Link>
            <Link href="/perks" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }} onClick={() => setSheet(false)}>Campus perks</Link>
            <Link href={userId ? "/u/" + userId : "/profile"} className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }} onClick={() => setSheet(false)}>👁 Public profile preview</Link>

            <div className="card" style={{ margin: "12px 0", background: "rgba(255,255,255,0.04)" }}>
              <div className="h2" style={{ fontSize: 14, marginBottom: 8 }}>🔒 Chat lock</div>
              {lockOn ? (
                <button className="btn-ghost btn-sm" onClick={disableLock}>Turn off lock</button>
              ) : (
                <div className="row" style={{ gap: 8 }}>
                  <input type="password" inputMode="numeric" placeholder="4+ digit PIN" value={newPin} onChange={e => setNewPin(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-sm" onClick={enableLock}>Enable</button>
                </div>
              )}
            </div>

            {invite && (
              <div className="card" style={{ marginBottom: 12, background: "rgba(255,255,255,0.04)" }}>
                <div className="h2" style={{ fontSize: 14, marginBottom: 6 }}>Invite friends</div>
                <p className="muted" style={{ fontSize: 12, wordBreak: "break-all" }}>{inviteUrl(invite)}</p>
                <button className="btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => {
                  navigator.clipboard?.writeText(inviteUrl(invite));
                  setMsg("Invite link copied");
                  setSheet(false);
                }}>Copy link</button>
              </div>
            )}

            <button className="btn-ghost" style={{ width: "100%", color: "#f43f5e" }} onClick={logout}>Log out</button>
          </div>
        </div>
      )}

      {coachOpen && coachPlan && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.72)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12,
        }}>
          <div className="card" style={{ width: "min(440px, 100%)", maxHeight: "85dvh", overflowY: "auto", borderRadius: 20 }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <div className="h2">Career guidance</div>
              <button className="btn-ghost btn-sm" onClick={() => setCoachOpen(false)}>Close</button>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{coachPlan.title}</p>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>{coachPlan.summary}</p>
            <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <span className="badge">{coachPlan.timelineWeeks} weeks</span>
              <span className="badge">~{coachPlan.dailyMinutes} min/day</span>
            </div>
            <div className="h2" style={{ fontSize: 14, marginBottom: 6 }}>Today</div>
            {coachPlan.dailyChecklist.map((t, i) => (
              <p key={i} style={{ fontSize: 13, marginBottom: 4 }}>• {t}</p>
            ))}
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => downloadIcs(coachPlan)}>Add to Calendar</button>
              <Link href="/coach" className="btn-ghost btn-sm" style={{ flex: 1, textAlign: "center" }} onClick={() => setCoachOpen(false)}>Full coach</Link>
            </div>
          </div>
        </div>
      )}

      <div className="page">
        <h1 className="h1" style={{ fontSize: 22, marginBottom: 4 }}>Your profile</h1>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          {isSuperAdmin(email) ? "Super admin" : "Public face of your campus identity"}
        </p>

        {/* Strength race meter */}
        <div className="card" style={{ marginBottom: 14, background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(236,72,153,0.08))" }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Profile strength</span>
            <span style={{ fontWeight: 800, background: "linear-gradient(90deg,#a78bfa,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: pct + "%", borderRadius: 4,
              background: "linear-gradient(90deg,#8b5cf6,#ec4899,#f59e0b)",
              transition: "width 0.4s ease",
            }} />
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            Fill photo, bio, goal, skills, GitHub → climb leaderboard. Campus race is real.
          </p>
        </div>

        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card stack" style={{ marginBottom: 14, alignItems: "center" }}>
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              width: 100, height: 100, borderRadius: "50%",
              background: preview ? "url(" + preview + ") center/cover" : "var(--grad-cool)",
              border: "3px solid rgba(139,92,246,0.45)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600,
            }}
          >{!preview && "Photo"}</div>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0] || null)} />
          <button type="button" className="btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>Select from gallery</button>
        </div>

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Public identity</div>
          <div>
            <span className="label">Full name *</span>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As on ID" />
          </div>
          <div>
            <span className="label">Username *</span>
            <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="unique_handle" />
          </div>
          <div>
            <span className="label">Bio * (shown on profile)</span>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Skills, interests, what you want on campus..." />
            <p className="muted" style={{ fontSize: 11 }}>{bio.trim().length}/20 min</p>
          </div>
          <div>
            <span className="label">Department</span>
            <select value={department} onChange={e => setDepartment(e.target.value)}>
              <option value="">Select</option>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <span className="label">Year</span>
            <select value={year} onChange={e => setYear(e.target.value)}>
              <option value="">—</option>
              <option value="1">1st</option><option value="2">2nd</option>
              <option value="3">3rd</option><option value="4">4th</option>
            </select>
          </div>
          <div>
            <span className="label">Phone (private · not on public profile)</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10 digits" inputMode="numeric" />
          </div>
        </div>

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Career & intent</div>
          <div>
            <span className="label">Main goal</span>
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. JP Morgan intern, SDE" />
          </div>
          <div>
            <span className="label">Looking for</span>
            <select value={intent} onChange={e => setIntent(e.target.value)}>
              <option value="">Select</option>
              {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <span className="label">Availability</span>
            <input value={availability} onChange={e => setAvailability(e.target.value)} placeholder="Weekends / after 6pm" />
          </div>
        </div>

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Builder card</div>
          <div>
            <span className="label">Skills</span>
            <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Python, React, Figma" />
          </div>
          <div>
            <span className="label">Tech stack</span>
            <input value={techStack} onChange={e => setTechStack(e.target.value)} placeholder="Next.js, Flutter..." />
          </div>
          <div>
            <span className="label">GitHub</span>
            <input value={github} onChange={e => setGithub(e.target.value)} placeholder="username" />
          </div>
          <div>
            <span className="label">LeetCode</span>
            <input value={leetcode} onChange={e => setLeetcode(e.target.value)} placeholder="username" />
          </div>
          <div>
            <span className="label">LinkedIn</span>
            <input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
        </div>

        <button className="btn" onClick={save} disabled={isSaving || !fullName.trim() || username.length < 3} style={{ width: "100%", padding: "14px" }}>
          {isSaving ? "Saving..." : "Save profile"}
        </button>
        <p className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: "center" }}>
          Tools (coach, lock, invite) live in ⚙️ top right — not under your bio
        </p>
      </div>
      <Nav />
    </div>
  );
}
