"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { generateId } from "@/lib/utils";
import { UserProfile } from "@/types";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { users, setCurrentUser, setUsers } = useStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Demo login: if no users, create a demo user
    // In production this would hit a real auth API
    await new Promise((r) => setTimeout(r, 600));

    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user && email) {
      // Create quick demo profile for first login
      const newUser: UserProfile = {
        id: generateId(),
        email,
        name: email.split("@")[0],
        college: "BMS",
        branch: "CSE",
        year: "3rd Year",
        bio: "Building cool things on campus.",
        skills: ["JavaScript", "React", "Python"],
        interests: ["AI", "Hackathons", "Startups"],
        careerInterests: ["Software Engineering"],
        goals: ["Find project partners"],
        lookingFor: ["Collaboration", "Hackathon teammate"],
        availability: ["Weekends", "Flexible"],
        verificationStatus: "verified",
        xp: 120,
        badges: ["Early Adopter"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUsers([...users, newUser]);
      user = newUser;
    }

    if (user) {
      setCurrentUser(user);
      router.push("/discover");
    } else {
      setError("Invalid credentials. Try signing up first.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center font-bold text-lg">
              M
            </div>
            <span className="text-2xl font-bold">MESH</span>
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-400 mt-2">Log in to find your people</p>
        </div>

        <form onSubmit={handleLogin} className="mesh-card p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mesh-input"
              placeholder="you@bmsce.ac.in"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mesh-input"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-purple-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
