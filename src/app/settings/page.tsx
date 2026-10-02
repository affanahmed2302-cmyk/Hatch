"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin } from "@/lib/supabase";
import {
  hasChatLock, setChatLockPin, clearChatLock, verifyPin,
} from "@/lib/chatLock";
import { ensureInviteCode, trackEvent } from "@/lib/safety";
import Nav from "@/components/Nav";

export default function SettingsPage() {
  const [lockOn, setLockOn] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [disablePin, setDisablePin] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [invite, setInvite] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profileMode, setProfileMode] = useState<"professional" | "social" | "both">("both");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      setLockOn(hasChatLock());
      setInvite(await ensureInviteCode(user.id));
      const { data } = await supabase.from("profiles").select("profile_mode").eq("id", user.id).maybeSingle();
      if (data?.profile_mode === "professional" || data?.profile_mode === "social" || data?.profile_mode === "both") {
        setProfileMode(data.profile_mode);
      }
      trackEvent(user.id, "settings_open");
    })();
  }, [router]);

  async function saveMode(mode: "professional" | "social" | "both") {
    if (!userId) return;
    setProfileMode(mode);
    const { error } = await supabase.from("profiles").update({
      profile_mode: mode,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    if (error) setErr(error.message + " — run hatch_profile_mode.sql");
    else setMsg(
      mode === "professional"
        ? "Others see career side (skills, GitHub, goals)"
        : mode === "social"
          ? "Others see social side (bio, vibe, year)"
          : "Others see full balanced profile"
    );
  }

  function enableLock() {
    if (newPin.length < 4) { setErr("PIN min 4 digits"); return; }
    if (newPin !== confirmPin) { setErr("PINs do not match"); return; }
    setChatLockPin(newPin);
    setLockOn(true);
    setNewPin(""); setConfirmPin(""); setErr("");
    setMsg("Chat lock on");
  }

  function disableLock() {
    if (!verifyPin(disablePin)) { setErr("Wrong PIN"); return; }
    clearChatLock();
    setLockOn(false); setShowDisable(false); setDisablePin(""); setErr("");
    setMsg("Chat lock off");
  }

  function copyInvite() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard?.writeText(`${origin}/signup?ref=${invite}`);
    setMsg("Invite link copied");
    if (userId) trackEvent(userId, "invite_copy", { code: invite });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/home" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 16 }}>Settings</div>
      </div>
      <div className="page stack">
        {msg && <div className="ok">{msg}</div>}
        {err && <div className="fail">{err}</div>}

        {isSuperAdmin(email) && (
          <Link href="/pilot" className="card" style={{
            textDecoration: "none", color: "#fff",
            background: "linear-gradient(135deg,#7c3aed,#db2777)",
            border: "none",
          }}>
            <div style={{ fontWeight: 900 }}>✈ CEO Pilot</div>
            <p style={{ fontSize: 12, opacity: 0.9 }}>Full admin control</p>
          </Link>
        )}

        <div className="card stack">
          <div className="h2">How others see you</div>
          <p className="muted" style={{ fontSize: 12 }}>
            Professional = skills & career · Social = vibe & bio · Both = balanced
          </p>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {(["professional", "social", "both"] as const).map((m) => (
              <button
                key={m}
                className={profileMode === m ? "btn btn-sm" : "btn-ghost btn-sm"}
                onClick={() => saveMode(m)}
              >
                {m === "both" ? "Both" : m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Link href="/profile" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 700 }}>Edit profile</div>
          <p className="muted" style={{ fontSize: 12 }}>Photo, skills, GitHub, bio</p>
        </Link>

        <Link href="/explore" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 700 }}>Explore</div>
          <p className="muted" style={{ fontSize: 12 }}>Teams, clubs, midnight, tools</p>
        </Link>

        <Link href="/sparks" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 700 }}>Campus Sparks</div>
          <p className="muted" style={{ fontSize: 12 }}>Dating · secondary · free at launch</p>
        </Link>

        <Link href="/clubs" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontWeight: 700 }}>Clubs</div>
          <p className="muted" style={{ fontSize: 12 }}>Club cores & events · growth focus</p>
        </Link>

        <div className="card stack">
          <div className="h2">Invite friends</div>
          <p className="muted" style={{ fontSize: 12, wordBreak: "break-all" }}>
            {invite ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${invite}` : "…"}
          </p>
          <button className="btn btn-sm" onClick={copyInvite}>Copy link</button>
        </div>

        <div className="card stack">
          <div className="h2">Chat lock</div>
          <p className="muted" style={{ fontSize: 12 }}>{lockOn ? "On" : "Off"}</p>
          {!lockOn ? (
            <>
              <input type="password" inputMode="numeric" placeholder="New PIN" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
              <input type="password" inputMode="numeric" placeholder="Confirm" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
              <button className="btn btn-sm" onClick={enableLock}>Enable</button>
            </>
          ) : !showDisable ? (
            <button className="btn-ghost btn-sm" onClick={() => setShowDisable(true)}>Turn off</button>
          ) : (
            <>
              <input type="password" inputMode="numeric" placeholder="PIN" value={disablePin} onChange={(e) => setDisablePin(e.target.value)} />
              <button className="btn btn-sm" onClick={disableLock}>Confirm</button>
            </>
          )}
        </div>

        <button className="btn-danger" onClick={logout} style={{ width: "100%" }}>Log out</button>
      </div>
      <Nav />
    </div>
  );
}
