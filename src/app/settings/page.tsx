"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  hasChatLock, setChatLockPin, clearChatLock, verifyPin, getDailyReminders, setDailyReminders,
} from "@/lib/chatLock";
import { ensureInviteCode, inviteUrl, trackEvent } from "@/lib/safety";
import Nav from "@/components/Nav";

export default function SettingsPage() {
  const [lockOn, setLockOn] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [disablePin, setDisablePin] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [invite, setInvite] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      setLockOn(hasChatLock());
      setReminders(getDailyReminders());
      setInvite(await ensureInviteCode(user.id));
      trackEvent(user.id, "settings_open");
    })();
  }, [router]);

  function enableLock() {
    if (newPin.length < 4) { setErr("PIN min 4 digits"); return; }
    if (newPin !== confirmPin) { setErr("PINs do not match"); return; }
    setChatLockPin(newPin);
    setLockOn(true);
    setNewPin(""); setConfirmPin(""); setErr("");
    setMsg("Chat lock enabled");
  }

  function disableLock() {
    if (!verifyPin(disablePin)) { setErr("Wrong PIN"); return; }
    clearChatLock();
    setLockOn(false); setShowDisable(false); setDisablePin(""); setErr("");
    setMsg("Chat lock disabled");
  }

  function copyInvite() {
    navigator.clipboard?.writeText(inviteUrl(invite));
    setMsg("Invite link copied — share on WhatsApp");
    if (userId) trackEvent(userId, "invite_copy", { code: invite });
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 14 }}>Settings</h1>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Invite friends</div>
          <p className="muted" style={{ fontSize: 12 }}>Grow campus with your link</p>
          <p style={{ fontSize: 13, wordBreak: "break-all" }}>{invite ? inviteUrl(invite) : "…"}</p>
          <button className="btn btn-sm" onClick={copyInvite}>Copy invite link</button>
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Chat lock</div>
          <p className="muted" style={{ fontSize: 12 }}>{lockOn ? "On · unlock once per session" : "Off"}</p>
          {!lockOn ? (
            <>
              <input type="password" inputMode="numeric" placeholder="New PIN (min 4)" value={newPin} onChange={e => setNewPin(e.target.value)} />
              <input type="password" inputMode="numeric" placeholder="Confirm PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} />
              <button className="btn btn-sm" onClick={enableLock}>Enable lock</button>
            </>
          ) : !showDisable ? (
            <button className="btn-ghost btn-sm" onClick={() => setShowDisable(true)}>Turn off lock</button>
          ) : (
            <>
              <input type="password" inputMode="numeric" placeholder="Current PIN" value={disablePin} onChange={e => setDisablePin(e.target.value)} />
              <button className="btn btn-sm" onClick={disableLock}>Confirm disable</button>
            </>
          )}
        </div>

        <div className="card stack" style={{ marginBottom: 12 }}>
          <div className="h2">Reminders</div>
          <label className="row" style={{ gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={reminders} onChange={e => { setReminders(e.target.checked); setDailyReminders(e.target.checked); }} />
            <span style={{ fontSize: 13 }}>Daily campus reminders (local)</span>
          </label>
        </div>

        <Link href="/saved" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }}>Saved people</Link>
        <Link href="/leaderboard" className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }}>Leaderboard</Link>
        <Link href="/profile" className="btn-ghost" style={{ display: "block", textAlign: "center" }}>Profile</Link>
      </div>
      <Nav />
    </div>
  );
}
