"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, saveProfile, isSuperAdmin } from "@/lib/supabase";
import { generateGoalPlan, downloadIcs, saveGoal } from "@/lib/coach";
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
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachPlan, setCoachPlan] = useState<ReturnType<typeof generateGoalPlan> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }
        setUserId(user.id);
        setEmail(user.email || "");
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

  function onPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Pick an image from gallery"); return; }
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
      if (error.message.includes("Bucket") || error.message.includes("not found")) {
        throw new Error("Create public Storage bucket named avatars in Supabase");
      }
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
      setMsg("Profile saved");

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

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">HATCH</div>
        <span className="badge" style={{ marginLeft: "auto" }}>Rep {rep}</span>
      </div>

      {coachOpen && coachPlan && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.72)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12,
        }}>
          <div className="card" style={{
            width: "min(440px, 100%)", maxHeight: "85dvh", overflowY: "auto",
            borderRadius: 20, marginBottom: 8,
          }}>
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
            <div className="h2" style={{ fontSize: 14, margin: "12px 0 6px" }}>Phases</div>
            {coachPlan.phases.slice(0, 3).map((ph, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>{ph.name}</strong>
                <span className="muted" style={{ fontSize: 12 }}> · W {ph.weeks}</span>
                <p className="muted" style={{ fontSize: 12 }}>{ph.focus}</p>
              </div>
            ))}
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => { downloadIcs(coachPlan); }}>
                Add to Calendar
              </button>
              <Link href="/coach" className="btn-ghost btn-sm" style={{ flex: 1, textAlign: "center" }} onClick={() => setCoachOpen(false)}>
                Full coach
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="page">
        <h1 className="h1" style={{ fontSize: 22, marginBottom: 4 }}>Your profile</h1>
        <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          {isSuperAdmin(email) ? "Super admin · full club control" : email}
        </p>

        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card stack" style={{ marginBottom: 14, alignItems: "center" }}>
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              width: 100, height: 100, borderRadius: "50%",
              background: preview ? "url(" + preview + ") center/cover" : "var(--grad-cool)",
              border: "3px solid rgba(139,92,246,0.45)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600,
            }}
          >
            {!preview && "Photo"}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
          <button type="button" className="btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>
            Select from gallery
          </button>
          <p className="muted" style={{ fontSize: 11 }}>Full-face preferred · max 5MB</p>
        </div>

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Identity</div>
          <div>
            <span className="label">Full name *</span>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As on ID" />
          </div>
          <div>
            <span className="label">Username *</span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="unique_handle"
            />
          </div>
          <div>
            <span className="label">Bio * (min 20)</span>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Skills, interests, what you want on campus..." />
            <p className="muted" style={{ fontSize: 11 }}>{bio.trim().length}/20</p>
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
              <option value="1">1st</option>
              <option value="2">2nd</option>
              <option value="3">3rd</option>
              <option value="4">4th</option>
            </select>
          </div>
          <div>
            <span className="label">Phone</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10 digits" inputMode="numeric" />
          </div>
        </div>

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Career focus</div>
          <div>
            <span className="label">Main goal</span>
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. JP Morgan intern, SDE, CAT" />
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
            <span className="label">Skills (comma separated)</span>
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
            <span className="label">LinkedIn URL</span>
            <input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
        </div>

        <button className="btn" onClick={save} disabled={isSaving || !fullName.trim() || username.length < 3}>
          {isSaving ? "Saving..." : "Save profile"}
        </button>
        <p className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: "center" }}>
          Saving opens career guidance for your goal
        </p>

        <Link href="/clubs" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 12 }}>
          Campus clubs
        </Link>
        <Link href="/coach" className="btn-ghost" style={{ display: "block", textAlign: "center", marginTop: 8 }}>
          Open full coach
        </Link>
        <button className="btn-ghost" style={{ width: "100%", marginTop: 12 }} onClick={logout}>Log out</button>
      </div>
      <Nav />
    </div>
  );
}
