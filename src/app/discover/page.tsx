"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, handleOf, yearToLabel } from "@/lib/supabase";
import Nav from "@/components/Nav";

export default function Discover() {
  const [tab, setTab] = useState<"discover" | "matches">("discover");
  const [people, setPeople] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setMyId(user.id);
      const { data: all } = await supabase.from("profiles")
        .select("id, full_name, username, bio, department, year, github_handle, leetcode_handle, tech_stack, avatar_url")
        .neq("id", user.id).limit(40);
      setPeople(all || []);

      const { data: cons } = await supabase.from("connections")
        .select("*")
        .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
        .eq("status", "accepted");
      const matchIds = (cons || []).map((c: any) => c.from_id === user.id ? c.to_id : c.from_id);
      if (matchIds.length) {
        const { data: ms } = await supabase.from("profiles").select("*").in("id", matchIds);
        setMatches(ms || []);
      } else setMatches([]);
    } catch (e: any) {
      setErr(e?.message || "Load failed");
    }
  }

  useEffect(() => { load(); }, []);

  async function connect(peerId: string) {
    if (!myId) return;
    setErr(""); setMsg("");
    try {
      const { error } = await supabase.from("connections").insert({
        from_id: myId, to_id: peerId, status: "pending",
      });
      if (error) {
        if (error.code === "23505") setMsg("Already requested");
        else setErr(error.message);
      } else setMsg("Request sent");
    } catch (e: any) {
      setErr(e?.message || "Failed");
    }
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button className={`chip ${tab === "discover" ? "on" : ""}`} onClick={() => setTab("discover")}>Discover</button>
          <button className={`chip ${tab === "matches" ? "on" : ""}`} onClick={() => setTab("matches")}>Your matches</button>
        </div>
        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}

        {tab === "discover" && people.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <div className="h2">{displayName(p)}</div>
            <div className="muted" style={{ fontSize: 12 }}>{handleOf(p)} · {p.department || "BMS"} · {yearToLabel(p.year)}</div>
            {p.bio && <p style={{ fontSize: 13, margin: "8px 0 0" }}>{p.bio}</p>}
            {(p.github_handle || p.tech_stack) && (
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {p.github_handle ? `gh/${p.github_handle}` : ""}{p.github_handle && p.tech_stack ? " · " : ""}{p.tech_stack || ""}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => connect(p.id)}>Connect</button>
              <Link href={`/chat/${p.id}`} className="btn-ghost btn-sm" style={{ flex: 1, textAlign: "center" }}>Chat</Link>
            </div>
          </div>
        ))}

        {tab === "matches" && matches.map(p => (
          <div key={p.id} className="card" style={{ marginBottom: 10 }}>
            <div className="h2">{displayName(p)}</div>
            <div className="muted" style={{ fontSize: 12 }}>{handleOf(p)}</div>
            <Link href={`/chat/${p.id}`} className="btn btn-sm" style={{ marginTop: 10, display: "block", textAlign: "center" }}>Open chat</Link>
          </div>
        ))}
        {tab === "matches" && matches.length === 0 && <div className="empty"><p>No matches yet</p></div>}
        {tab === "discover" && people.length === 0 && <div className="empty"><p>No one else yet</p></div>}
      </div>
      <Nav />
    </div>
  );
}
