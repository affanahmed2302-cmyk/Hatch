"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  hasChatLock, setChatLockPin, clearChatLock, verifyPin,
  getDailyReminders, setDailyReminders,
} from "@/lib/chatLock";
import Nav from "@/components/Nav";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [lockOn, setLockOn] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [disablePin, setDisablePin] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setLockOn(hasChatLock());
      setReminders(getDailyReminders());
      setLoading(false);
    })();
  }, [router]);

  function enableLock() {
    setErr(""); setMsg("");
    if (newPin.length < 4) { setErr("PIN min 4 digits"); return; }
    if (newPin !== confirmPin) { setErr("PINs do not match"); return; }
    setChatLockPin(newPin);
    setLockOn(true);
    setNewPin(""); setConfirmPin("");
    setMsg("Chat lock enabled");
  }

  function tryDisable() {
    setErr("");
    if (!verifyPin(disablePin)) { setErr("Wrong PIN"); return; }
    clearChatLock();
    setLockOn(false);
    setShowDisable(false);
    setDisablePin("");
    setMsg("Chat lock disabled");
  }

  function toggleReminders() {
    const next = !reminders;
    setReminders(next);
    setDailyReminders(next);
    setMsg(next ? "Reminders on" : "Reminders off");
  }

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/profile" className="btn-ghost btn-sm">← Profile</Link>
        <div className="logo" style={{ marginLeft: 8 }}>HATCH</div>
      </div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 12 }}>Settings</h1>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Chat lock</div>
          <p className="muted" style={{ fontSize: 13 }}>
            {lockOn
              ? "On · unlock once per session when you open Inbox"
              : "Off · all chats open normally"}
          </p>
          {!lockOn ? (
            <>
              <input type="password" inputMode="numeric" placeholder="New PIN (min 4)" value={newPin} onChange={e => setNewPin(e.target.value)} />
              <input type="password" inputMode="numeric" placeholder="Confirm PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} />
              <button className="btn btn-sm" onClick={enableLock}>Enable lock</button>
            </>
          ) : !showDisable ? (
            <button className="btn-danger" onClick={() => setShowDisable(true)}>Turn off lock…</button>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 13 }}>Enter your PIN to disable</p>
              <input type="password" inputMode="numeric" placeholder="Current PIN" value={disablePin} onChange={e => setDisablePin(e.target.value)} />
              <button className="btn-danger" onClick={tryDisable}>Confirm disable</button>
              <button className="btn-ghost btn-sm" onClick={() => setShowDisable(false)}>Cancel</button>
            </>
          )}
        </div>

        <div className="card stack">
          <div className="h2">Daily reminders</div>
          <button className="btn-ghost" onClick={toggleReminders}>
            {reminders ? "Reminders: ON" : "Reminders: OFF"}
          </button>
        </div>
      </div>
      <Nav />
    </div>
  );
}
