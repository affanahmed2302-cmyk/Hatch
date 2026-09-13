"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { rankMatches } from "@/lib/matching";
import { MatchResult, UserProfile } from "@/types";
import { generateId } from "@/lib/utils";
import { Heart, X, MessageCircle, User, LogOut, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Seed demo users for empty campus
const DEMO_USERS: UserProfile[] = [
  {
    id: "demo-1",
    email: "arjun@bmsce.ac.in",
    name: "Arjun Mehta",
    college: "BMS",
    branch: "CSE",
    year: "3rd Year",
    bio: "Building AI tools and competing in hackathons. Looking for strong frontend partners.",
    skills: ["Python", "Machine Learning", "React", "FastAPI"],
    interests: ["AI", "Hackathons", "Startups"],
    careerInterests: ["ML Engineer"],
    goals: ["Win a major hackathon"],
    lookingFor: ["Hackathon teammate", "Project partner", "Collaboration"],
    availability: ["Weekends", "Weekday evenings"],
    verificationStatus: "verified",
    xp: 340,
    badges: ["Builder", "Hackathon Regular"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    email: "priya@bmsce.ac.in",
    name: "Priya Sharma",
    college: "BMS",
    branch: "ISE",
    year: "2nd Year",
    bio: "UI/UX designer who codes. Love clean interfaces and good product sense.",
    skills: ["Figma", "UI/UX", "JavaScript", "React"],
    interests: ["Design", "Startups", "Hackathons"],
    careerInterests: ["Product Design"],
    goals: ["Ship real products"],
    lookingFor: ["Collaboration", "Startup teammate", "Designer"],
    availability: ["Flexible"],
    verificationStatus: "verified",
    xp: 210,
    badges: ["Designer"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    email: "rahul@bmsce.ac.in",
    name: "Rahul Nair",
    college: "BMS",
    branch: "CSE",
    year: "4th Year",
    bio: "Backend + systems. Competitive programming background. Looking for serious project partners.",
    skills: ["Java", "C++", "DSA", "Node.js", "System Design"],
    interests: ["Competitive Programming", "Open Source", "Research"],
    careerInterests: ["Software Engineering"],
    goals: ["Open source contributions"],
    lookingFor: ["Project partner", "Collaboration", "Mentor"],
    availability: ["Weekday evenings"],
    verificationStatus: "verified",
    xp: 520,
    badges: ["Problem Solver", "Builder"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-4",
    email: "ananya@bmsce.ac.in",
    name: "Ananya Reddy",
    college: "BMS",
    branch: "AI/ML",
    year: "3rd Year",
    bio: "Deep learning + computer vision. Always looking for interesting research or product ideas.",
    skills: ["Python", "Machine Learning", "PyTorch", "Computer Vision"],
    interests: ["AI", "Research", "Hackathons"],
    careerInterests: ["Research", "ML Engineer"],
    goals: ["Publish a paper", "Build an AI product"],
    lookingFor: ["Research", "Hackathon teammate", "Collaboration"],
    availability: ["Weekends"],
    verificationStatus: "verified",
    xp: 410,
    badges: ["Innovator"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function DiscoverPage() {
  const router = useRouter();
  const { currentUser, users, setUsers, addConnection, isAuthenticated, logout } = useStore();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [index, setIndex] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [lastMatched, setLastMatched] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.push("/login");
      return;
    }

    // Seed demo users if empty
    if (users.length < 3) {
      const existingIds = new Set(users.map((u) => u.id));
      const toAdd = DEMO_USERS.filter((d) => !existingIds.has(d.id));
      if (toAdd.length) {
        setUsers([...users, ...toAdd]);
      }
    }
  }, [isAuthenticated, currentUser, users, setUsers, router]);

  useEffect(() => {
    if (currentUser && users.length > 0) {
      const ranked = rankMatches(currentUser, users);
      setMatches(ranked);
      setIndex(0);
    }
  }, [currentUser, users]);

  const current = matches[index];

  const handlePass = () => {
    setIndex((i) => Math.min(i + 1, matches.length));
  };

  const handleConnect = () => {
    if (!current || !currentUser) return;
    addConnection({
      id: generateId(),
      userId: currentUser.id,
      targetId: current.user.id,
      status: "accepted",
      createdAt: new Date().toISOString(),
    });
    setLastMatched(current);
    setShowMatch(true);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a3a] safe-bottom">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center font-bold text-sm">
            M
          </div>
          <span className="font-bold">MESH</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-2 rounded-xl hover:bg-[#1c1c28] transition">
            <User size={20} className="text-gray-300" />
          </Link>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="p-2 rounded-xl hover:bg-[#1c1c28] transition"
          >
            <LogOut size={20} className="text-gray-400" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {index >= matches.length ? (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 flex items-center justify-center mx-auto mb-4 text-purple-400">
              <Sparkles size={28} />
            </div>
            <h2 className="text-xl font-bold mb-2">You’re all caught up</h2>
            <p className="text-gray-400 text-sm mb-6">
              No more profiles right now. Check back later or invite friends from BMS.
            </p>
            <Link href="/profile" className="btn-secondary inline-block">
              View your profile
            </Link>
          </div>
        ) : current ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={current.user.id}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md"
            >
              <div className="mesh-card overflow-hidden">
                {/* Photo placeholder */}
                <div className="h-48 bg-gradient-to-br from-purple-600/40 to-cyan-500/30 flex items-center justify-center relative">
                  <div className="w-24 h-24 rounded-full bg-[#1c1c28] border-4 border-[#0a0a0f] flex items-center justify-center text-3xl font-bold text-purple-300">
                    {current.user.name.charAt(0)}
                  </div>
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-cyan-300">
                    {Math.round(current.score * 100)}% match
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h2 className="text-xl font-bold">{current.user.name}</h2>
                      <p className="text-sm text-gray-400">
                        {current.user.branch} • {current.user.year} • {current.user.college}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 mt-3 leading-relaxed">
                    {current.user.bio}
                  </p>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {current.user.skills.slice(0, 6).map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Why match */}
                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Why you matched
                    </p>
                    {current.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{r.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-6 mt-6">
                <button
                  onClick={handlePass}
                  className="w-14 h-14 rounded-full border-2 border-[#2a2a3a] flex items-center justify-center text-gray-400 hover:border-red-500/50 hover:text-red-400 transition"
                >
                  <X size={26} />
                </button>
                <button
                  onClick={handleConnect}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:scale-105 transition"
                >
                  <Heart size={28} fill="currentColor" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </main>

      {/* Match modal */}
      <AnimatePresence>
        {showMatch && lastMatched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mesh-card p-8 max-w-sm w-full text-center"
            >
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold mb-2">It’s a Match!</h2>
              <p className="text-gray-400 text-sm mb-6">
                You and {lastMatched.user.name} connected.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowMatch(false);
                    setIndex((i) => i + 1);
                  }}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  Start Chat
                </button>
                <button
                  onClick={() => {
                    setShowMatch(false);
                    setIndex((i) => i + 1);
                  }}
                  className="btn-secondary w-full py-3"
                >
                  Keep discovering
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
