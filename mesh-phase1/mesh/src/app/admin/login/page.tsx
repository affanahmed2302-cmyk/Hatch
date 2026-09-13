"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ADMIN_STORAGE_KEY = "mesh-admin-credentials";

export default function AdminLoginPage() {
  const [mode, setMode] = useState<"setup" | "login">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!stored) {
      setMode("setup");
    } else {
      setMode("login");
      setSetupDone(true);
    }
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    // In production this would hash server-side. For MVP we store a simple hash-like value.
    const payload = {
      username,
      // Simple obfuscation only — real app must use bcrypt/argon2 server-side
      passwordHash: btoa(password + ":mesh-salt-v1"),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem("mesh-admin-session", "true");
    setLoading(false);
    router.push("/admin/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!stored) {
      setError("No admin account found. Please set up first.");
      setMode("setup");
      setLoading(false);
      return;
    }
    const data = JSON.parse(stored);
    const attempt = btoa(password + ":mesh-salt-v1");
    if (data.username === username && data.passwordHash === attempt) {
      localStorage.setItem("mesh-admin-session", "true");
      router.push("/admin/dashboard");
    } else {
      setError("Invalid username or password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center font-bold">
              M
            </div>
            <span className="text-xl font-bold">MESH</span>
          </div>
          <h1 className="text-2xl font-bold">
            {mode === "setup" ? "Create Super Admin" : "Super Admin"}
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {mode === "setup"
              ? "First-time setup. Choose a strong username and password."
              : "Secure admin access only"}
          </p>
        </div>

        <form
          onSubmit={mode === "setup" ? handleSetup : handleLogin}
          className="mesh-card p-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Username</label>
            <input
              className="mesh-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              className="mesh-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete={mode === "setup" ? "new-password" : "current-password"}
            />
          </div>
          {mode === "setup" && (
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Confirm password</label>
              <input
                type="password"
                className="mesh-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "setup"
              ? "Create Admin Account"
              : "Log in to Admin"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          <Link href="/" className="hover:text-gray-300">
            ← Back to MESH
          </Link>
        </p>
      </div>
    </div>
  );
}
