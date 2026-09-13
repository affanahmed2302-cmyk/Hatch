"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Zap, MessageCircle, Trophy, ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center font-bold text-lg">
            M
          </div>
          <span className="text-xl font-bold tracking-tight">MESH</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-300 hover:text-white transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="btn-primary text-sm px-5 py-2.5"
          >
            Join MESH
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-16 pb-24 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-6">
            <Sparkles size={14} />
            Now live for BMS College
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            I need someone.
            <br />
            <span className="gradient-text">MESH found them.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
            Discover teammates, collaborators, mentors and opportunities on campus.
            Skill-based matching that actually makes sense.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-primary text-base px-8 py-3.5 inline-flex items-center justify-center gap-2">
              Get started free
              <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3.5 inline-flex items-center justify-center">
              I already have an account
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Users,
              title: "Smart Matching",
              desc: "Match on skills, interests, goals and what you’re looking for — not just looks.",
            },
            {
              icon: Zap,
              title: "Find Teams Fast",
              desc: "Hackathon teammates, project partners, startup co-founders — all in one place.",
            },
            {
              icon: MessageCircle,
              title: "Real Conversations",
              desc: "Chat instantly after you match. Share projects, invite to teams, build together.",
            },
            {
              icon: Trophy,
              title: "Campus Opportunities",
              desc: "Events, clubs, challenges and more. Stay plugged into what’s happening.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
              className="mesh-card p-5"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center mb-4 text-purple-400">
                <f.icon size={20} />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 pb-20 text-center">
        <div className="max-w-2xl mx-auto mesh-card p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to find your people?
          </h2>
          <p className="text-gray-400 mb-8">
            Join the BMS network. It takes less than 2 minutes.
          </p>
          <Link href="/signup" className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2">
            Create your profile
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#2a2a3a] px-6 py-8 text-center text-sm text-gray-500">
        <p>MESH — Find your people. Built for BMS College.</p>
        <p className="mt-2 text-xs">Phase 1 • Expanding to more campuses soon</p>
      </footer>
    </div>
  );
}
