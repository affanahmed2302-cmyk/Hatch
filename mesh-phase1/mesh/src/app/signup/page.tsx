"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { generateId } from "@/lib/utils";
import { UserProfile, College, LookingFor } from "@/types";

const BRANCHES = ["CSE", "ISE", "ECE", "EEE", "ME", "Civil", "AI/ML", "Data Science", "Other"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Masters", "Alumni"];
const SKILLS = ["JavaScript", "Python", "React", "Node.js", "Java", "C++", "Machine Learning", "UI/UX", "Figma", "DSA", "Flutter", "Go", "Rust", "Cloud", "DevOps"];
const INTERESTS = ["AI", "Hackathons", "Startups", "Open Source", "Web3", "Design", "Robotics", "Gaming", "Music", "Photography", "Research", "Competitive Programming"];
const LOOKING: LookingFor[] = ["Collaboration", "Hackathon teammate", "Project partner", "Learning partner", "Study partner", "Mentor", "Startup teammate", "Networking", "Friends"];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    college: "BMS" as College,
    branch: "CSE",
    year: "3rd Year",
    bio: "",
    skills: [] as string[],
    interests: [] as string[],
    lookingFor: [] as LookingFor[],
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addUser, setCurrentUser, users } = useStore();

  const toggle = (field: "skills" | "interests" | "lookingFor", value: string) => {
    setForm((prev) => {
      const arr = prev[field] as string[];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v) => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const handleFinish = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    const newUser: UserProfile = {
      id: generateId(),
      email: form.email,
      name: form.name,
      college: form.college,
      branch: form.branch,
      year: form.year,
      bio: form.bio || "Excited to connect on MESH!",
      skills: form.skills,
      interests: form.interests,
      careerInterests: [],
      goals: [],
      lookingFor: form.lookingFor,
      availability: ["Flexible"],
      verificationStatus: "verified",
      xp: 50,
      badges: ["Early Adopter"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addUser(newUser);
    setCurrentUser(newUser);
    router.push("/discover");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center font-bold">
              M
            </div>
            <span className="text-xl font-bold">MESH</span>
          </Link>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-12 rounded-full transition ${
                  s <= step ? "bg-purple-500" : "bg-[#2a2a3a]"
                }`}
              />
            ))}
          </div>
          <h1 className="text-2xl font-bold">
            {step === 1 && "Create your account"}
            {step === 2 && "Your campus details"}
            {step === 3 && "Skills & what you’re looking for"}
          </h1>
        </div>

        <div className="mesh-card p-6 space-y-5">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Full name</label>
                <input
                  className="mesh-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">College email</label>
                <input
                  type="email"
                  className="mesh-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@bmsce.ac.in"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                <input
                  type="password"
                  className="mesh-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <button
                onClick={() => form.name && form.email && form.password.length >= 6 && setStep(2)}
                className="btn-primary w-full py-3"
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">College</label>
                <select
                  className="mesh-input"
                  value={form.college}
                  onChange={(e) => setForm({ ...form, college: e.target.value as College })}
                >
                  <option value="BMS">BMS College of Engineering</option>
                  <option value="PES">PES University</option>
                  <option value="Jain">Jain University</option>
                  <option value="RV">RV College</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Branch</label>
                <select
                  className="mesh-input"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Year</label>
                <select
                  className="mesh-input"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Short bio</label>
                <textarea
                  className="mesh-input min-h-[80px] resize-none"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="What are you into?"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">
                  Back
                </button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1 py-3">
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Skills (select a few)</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggle("skills", s)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        form.skills.includes(s)
                          ? "bg-purple-500/20 border-purple-500 text-purple-300"
                          : "border-[#2a2a3a] text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggle("interests", i)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        form.interests.includes(i)
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                          : "border-[#2a2a3a] text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Looking for</label>
                <div className="flex flex-wrap gap-2">
                  {LOOKING.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => toggle("lookingFor", l)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        form.lookingFor.includes(l)
                          ? "bg-purple-500/20 border-purple-500 text-purple-300"
                          : "border-[#2a2a3a] text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-3">
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading || form.skills.length === 0}
                  className="btn-primary flex-1 py-3 disabled:opacity-50"
                >
                  {loading ? "Creating profile..." : "Join MESH"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
