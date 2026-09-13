"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import {
  Users,
  Activity,
  Flag,
  Settings,
  LogOut,
  Shield,
  BarChart3,
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const { users, connections } = useStore();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("mesh-admin-session");
    if (session !== "true") {
      router.push("/admin/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("mesh-admin-session");
    router.push("/admin/login");
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-400">
        Checking authorization...
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: users.length, icon: Users },
    { label: "Connections", value: connections.length, icon: Activity },
    { label: "Reports", value: 0, icon: Flag },
    { label: "Active Today", value: Math.min(users.length, 12), icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="border-b border-[#2a2a3a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center font-bold">
            M
          </div>
          <div>
            <div className="font-bold">MESH Admin</div>
            <div className="text-xs text-gray-500">Super Admin Dashboard</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
        >
          <LogOut size={16} />
          Logout
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Shield size={20} className="text-purple-400" />
          <h1 className="text-2xl font-bold">Overview</h1>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="mesh-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{s.label}</span>
                <s.icon size={18} className="text-purple-400" />
              </div>
              <div className="text-3xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="mesh-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Users size={18} /> Recent Users
            </h2>
            {users.length === 0 ? (
              <p className="text-sm text-gray-500">No users yet.</p>
            ) : (
              <div className="space-y-3">
                {users.slice(-8).reverse().map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between py-2 border-b border-[#2a2a3a] last:border-0"
                  >
                    <div>
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="text-xs text-gray-500">
                        {u.college} • {u.branch} • {u.year}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400">
                      {u.verificationStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mesh-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Settings size={18} /> Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 rounded-xl bg-[#1c1c28] hover:bg-[#242430] transition text-sm">
                Manage Feature Flags
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl bg-[#1c1c28] hover:bg-[#242430] transition text-sm">
                Review Reports
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl bg-[#1c1c28] hover:bg-[#242430] transition text-sm">
                Platform Settings
              </button>
              <Link
                href="/"
                className="block w-full text-left px-4 py-3 rounded-xl bg-[#1c1c28] hover:bg-[#242430] transition text-sm"
              >
                View Student App
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
          <strong>Note:</strong> This is the Phase 1 Super Admin dashboard. Full moderation,
          analytics, payments and feature-flag controls will be expanded in later phases.
          All sensitive actions must remain server-side in production.
        </div>
      </main>
    </div>
  );
}
