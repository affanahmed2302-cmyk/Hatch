"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";

export default function Teams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setMyId(user.id);
    const { data } = await supabase.from("teams").select("*").order("created_at", { ascending: false }).limit(30);
    setTeams(data || []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!myId || !name.trim()) return;
    const { data, error } = await supabase.from("teams").insert({
      name: name.trim(), description: desc || null, leader_id: myId, owner_id: myId, status: "open", members_needed: 4,
    }).select("*").single();
    if (error) { setMsg(error.message); return; }
    if (data) await supabase.from("team_members").insert({ team_id: data.id, user_id: myId, role: "admin" });
    setName(""); setDesc(""); setMsg("Team created"); await load();
  }

  async function requestJoin(teamId: string) {
    if (!myId) return;
    const { error } = await supabase.from("team_requests").insert({ team_id: teamId, user_id: myId, status: "pending" });
    setMsg(error ? error.message : "Request sent");
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">MESH</div></div>
      <div className="page fade">
        <h1 className="h1" style={{ marginBottom: 12 }}>Teams</h1>
        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
        <div className="card stack" style={{ marginBottom: 14 }}>
          <input placeholder="Team name" value={name} onChange={e => setName(e.target.value)} />
          <textarea placeholder="What are you building?" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <button className="btn btn-sm" onClick={create} disabled={!name.trim()}>Create team</button>
        </div>
        {teams.map(t => (
          <div key={t.id} className="card card-lift" style={{ marginBottom: 10 }}>
            <div className="h2">{t.name}</div>
            {t.description && <p className="muted" style={{ fontSize: 13 }}>{t.description}</p>}
            <button className="btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => requestJoin(t.id)}>Request to join</button>
          </div>
        ))}
      </div>
      <Nav />
    </div>
  );
}
