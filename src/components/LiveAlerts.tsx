"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase, displayName } from "@/lib/supabase";
import { fetchActiveIncoming, respondCall, callEmbedUrl, type CallRow } from "@/lib/calls";
import { ensureNotifyPermission, notifyUser } from "@/lib/notify";

/** Global: message notifications + incoming call overlay (any page) */
export default function LiveAlerts() {
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState("Hatch");
  const [incoming, setIncoming] = useState<CallRow | null>(null);
  const [callerName, setCallerName] = useState("Someone");
  const [banner, setBanner] = useState("");
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);
      const { data: me } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
      setMyName(displayName(me || {}) || "Hatch");
      await ensureNotifyPermission();

      const active = await fetchActiveIncoming(user.id);
      if (active) {
        setIncoming(active);
        const { data: c } = await supabase.from("profiles").select("full_name, username").eq("id", active.caller_id).maybeSingle();
        setCallerName(displayName(c || {}) || "Someone");
      }
    })();
  }, []);

  useEffect(() => {
    if (!myId) return;

    const msgCh = supabase
      .channel("global-msgs-" + myId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${myId}` },
        async (payload) => {
          const row = payload.new as any;
          if (!row) return;
          // skip if already in that chat
          if (path === `/chat/${row.sender_id}`) return;
          const { data: s } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", row.sender_id)
            .maybeSingle();
          const who = displayName(s || {}) || "Someone";
          const preview = row.media_url ? "🎤 Voice note" : String(row.content || "").slice(0, 80);
          notifyUser(who, preview, { url: `/chat/${row.sender_id}`, tag: "msg-" + row.sender_id });
          setBanner(`${who}: ${preview}`);
          setTimeout(() => setBanner(""), 5000);
        }
      )
      .subscribe();

    const callCh = supabase
      .channel("global-calls-" + myId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        async (payload) => {
          const row = (payload.new || payload.old) as CallRow;
          if (!row) return;
          if (row.callee_id === myId && row.status === "ringing") {
            setIncoming(row);
            const { data: c } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", row.caller_id)
              .maybeSingle();
            const who = displayName(c || {}) || "Someone";
            setCallerName(who);
            notifyUser("Incoming call", `${who} is calling (${row.call_type})`, {
              url: `/chat/${row.caller_id}`,
              tag: "call-" + row.id,
            });
            setBanner(`📞 ${who} is calling…`);
          }
          if (row.callee_id === myId && ["ended", "rejected", "missed", "accepted"].includes(row.status)) {
            if (row.status !== "accepted") setIncoming(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgCh);
      supabase.removeChannel(callCh);
    };
  }, [myId, path]);

  async function accept() {
    if (!incoming) return;
    const res = await respondCall(incoming.id, true);
    if (!res.ok || !res.call) return;
    const url = callEmbedUrl(res.call, myName);
    setIncoming(null);
    // open call in chat route via query is messy — go to chat; they can join from banner
    sessionStorage.setItem("hatch_active_call_url", url);
    sessionStorage.setItem("hatch_active_call_id", res.call.id);
    router.push(`/chat/${incoming.caller_id}?call=1`);
  }

  async function decline() {
    if (!incoming) return;
    await respondCall(incoming.id, false);
    setIncoming(null);
    setBanner("");
  }

  return (
    <>
      {banner && !incoming && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            maxWidth: "min(420px, 92vw)",
            background: "rgba(20,20,30,0.95)",
            border: "1px solid rgba(139,92,246,0.5)",
            borderRadius: 14,
            padding: "10px 14px",
            fontSize: 13,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {banner}
        </div>
      )}

      {incoming && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "min(360px, 100%)",
              textAlign: "center",
              background: "linear-gradient(160deg,#1e1b4b,#4c1d95)",
              border: "1px solid rgba(167,139,250,0.5)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>{callerName}</div>
            <p className="muted" style={{ marginTop: 6 }}>
              Incoming {incoming.call_type} call
            </p>
            <div className="row" style={{ gap: 12, justifyContent: "center", marginTop: 16 }}>
              <button className="btn" style={{ background: "#22c55e", color: "#000" }} onClick={accept}>
                Accept
              </button>
              <button className="btn" style={{ background: "#f43f5e" }} onClick={decline}>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
