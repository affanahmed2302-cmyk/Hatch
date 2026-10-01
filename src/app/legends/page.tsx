"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, isSuperAdmin } from "@/lib/supabase";
import { hasActiveMembership } from "@/lib/membership";
import Paywall from "@/components/Paywall";
import Nav from "@/components/Nav";

export default function LegendsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [member, setMember] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function loadMsgs() {
    const { data } = await supabase
      .from("legends_messages")
      .select("id, sender_id, body, created_at")
      .order("created_at", { ascending: true })
      .limit(80);
    if (!data?.length) { setMessages([]); return; }
    const ids = [...new Set(data.map((m) => m.sender_id))];
    const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", ids);
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
    setMessages(data.map((m) => ({ ...m, profile: map[m.sender_id] })));
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      const ok = isSuperAdmin(user.email) || (await hasActiveMembership(user.id, "legends"));
      setMember(ok);
      if (ok) await loadMsgs();
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!userId || !text.trim()) return;
    const body = text.trim().slice(0, 500);
    setText("");
    const { error } = await supabase.from("legends_messages").insert({ sender_id: userId, body });
    if (error) setErr(error.message + " — run hatch_membership.sql");
    else await loadMsgs();
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }

  if (!member) {
    return (
      <div className="shell" style={{ background: "#0c0a09" }}>
        <div className="topbar" style={{ background: "linear-gradient(90deg,#78350f,#a16207)", border: "none" }}>
          <Link href="/home" className="btn-ghost btn-sm" style={{ color: "#fff" }}>←</Link>
          <div style={{ fontWeight: 900, color: "#fef3c7" }}>Legends of BMSCE</div>
        </div>
        <div className="page">
          <div className="card" style={{ marginBottom: 12, border: "1px solid rgba(251,191,36,0.45)" }}>
            <div style={{ fontWeight: 900, fontSize: 22 }}>Join the society</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
              A private chatroom for people who actually ship — founders, club cores, hack winners,
              placement legends. Not for everyone. ₹999 / month keeps it exclusive.
            </p>
          </div>
          {userId && (
            <Paywall
              product="legends"
              userId={userId}
              bullets={[
                "Private Legends-only chatbox",
                "Direct access to high-signal peers",
                "Monthly membership · limited seats culture",
                "Coupon codes accepted",
              ]}
              onUnlocked={async () => {
                setMember(true);
                await loadMsgs();
              }}
            />
          )}
        </div>
        <Nav />
      </div>
    );
  }

  return (
    <div className="shell" style={{ background: "#0c0a09", display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: 0 }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#78350f,#a16207)", border: "none" }}>
        <Link href="/home" className="btn-ghost btn-sm" style={{ color: "#fff" }}>←</Link>
        <div style={{ fontWeight: 900, color: "#fef3c7" }}>Legends · live</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: "#a8a29e", marginBottom: 2 }}>{displayName(m.profile || {})}</p>
            <div className={m.sender_id === userId ? "bubble-me" : "bubble-them"}>{m.body}</div>
          </div>
        ))}
        {!messages.length && <p className="muted" style={{ textAlign: "center", marginTop: 40 }}>First message owns the room</p>}
        <div ref={bottom} />
      </div>
      <div className="row" style={{ gap: 8, padding: 12, borderTop: "1px solid var(--border)" }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message legends…" style={{ flex: 1 }}
          onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="btn btn-sm" onClick={send}>Send</button>
      </div>
    </div>
  );
}
