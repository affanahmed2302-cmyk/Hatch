"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, displayName, handleOf, yearToLabel } from "@/lib/supabase";
import Nav from "@/components/Nav";

export default function Discover() {
  const [tab, setTab] = useState<"discover" | "matches">("discover");
  const [people, setPeople] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setMyId(user.id);
    const { data: all } = await supabase.from("profiles")
      .select("id, full_name, username, bio, department, year, skills, avatar_url")
      .neq("id", user.id).limit(40);
    setPeople(all || []);

    const { data: cons } = await supabase.from("connections")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .eq("status", "accepted");
    const matchIds = (cons || []).map((c: any) => c.user_a === user.id ? c.user_b : c.user_a);
    if (matchIds.length) {
      const { data: ms } = await supabase.from("profiles").select("*").in("id", matchIds);
      setMatches(ms || []);
    } else setMatches([]);
  }

  useEffect(() => { load(); }, []);

  async function connect(peerId: string) {
    if (!myId) return;
    const [a, b] = [myId, peerId].sort();
    const { error } = await supabase.from("connections").upsert({
      user_a: a, user_b: b, status: "pending", requested_by: myId,
    }, { onConflict: "user_a,user_b" });
    setMsg(error ? error.message : "Request sent");
  }

  async function openChat(peerId: string) {
    router.push(`/chat/${peerId}`);
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">MESH</div></div>
      <div className="page fade">
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button className={`chip ${tab === "discover" ? "on" : ""}`} onClick={() => setTab("discover")}>Discover</button>
          <button className={`chip ${tab === "matches" ? "on" : ""}`} onClick={() => setTab("matches")}>Your matches</button>
        </div>
        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}

        {tab === "discover" && people.map(p => (
          <div key={p.id} className="card card-lift fade-up" style={{ marginBottom: 10 }}>
            <div className="h2">{displayName(p)}</div>
            <div className="muted" style={{ fontSize: 12 }}>{handleOf(p)} · {p.department || "BMS"} · {yearToLabel(p.year)}</div>
            {p.bio && <p style={{ fontSize: 13, margin: "8px 0 0" }}>{p.bio}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => connect(p.id)}>Connect</button>
              <button className="btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openChat(p.id)}>Chat</button>
            </div>
          </div>
        ))}

        {tab === "matches" && matches.map(p => (
          <div key={p.id} className="card card-lift fade-up" style={{ marginBottom: 10 }}>
            <div className="h2">{displayName(p)}</div>
            <div className="muted" style={{ fontSize: 12 }}>{handleOf(p)}</div>
            <button className="btn btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => openChat(p.id)}>Open chat</button>
          </div>
        ))}
        {tab === "matches" && matches.length === 0 && <div className="empty"><p>No matches yet</p></div>}
        {tab === "discover" && people.length === 0 && <div className="empty"><p>No one else yet</p></div>}
      </div>
      <Nav />
    </div>
  );
}
