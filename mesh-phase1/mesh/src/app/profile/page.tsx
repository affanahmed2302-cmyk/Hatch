"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { ArrowLeft, LogOut, Edit3 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, isAuthenticated, logout } = useStore();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a3a]">
        <Link href="/discover" className="p-2 rounded-xl hover:bg-[#1c1c28]">
          <ArrowLeft size={20} />
        </Link>
        <span className="font-semibold">Your Profile</span>
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="p-2 rounded-xl hover:bg-[#1c1c28] text-gray-400"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-3xl font-bold mb-4">
            {currentUser.name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold">{currentUser.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {currentUser.branch} • {currentUser.year} • {currentUser.college}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-medium">
              {currentUser.verificationStatus}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 text-xs font-medium">
              {currentUser.xp} XP
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <div className="mesh-card p-5">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Bio</h3>
            <p className="text-sm text-gray-200 leading-relaxed">{currentUser.bio}</p>
          </div>

          <div className="mesh-card p-5">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {currentUser.skills.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 text-sm"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mesh-card p-5">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {currentUser.interests.map((i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 text-sm"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>

          <div className="mesh-card p-5">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Looking for</h3>
            <div className="flex flex-wrap gap-2">
              {currentUser.lookingFor.map((l) => (
                <span
                  key={l}
                  className="px-3 py-1.5 rounded-lg bg-[#1c1c28] border border-[#2a2a3a] text-gray-300 text-sm"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>

          {currentUser.badges.length > 0 && (
            <div className="mesh-card p-5">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Badges</h3>
              <div className="flex flex-wrap gap-2">
                {currentUser.badges.map((b) => (
                  <span
                    key={b}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 text-sm"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/discover" className="btn-primary inline-block px-8 py-3">
            Back to Discover
          </Link>
        </div>
      </main>
    </div>
  );
}
