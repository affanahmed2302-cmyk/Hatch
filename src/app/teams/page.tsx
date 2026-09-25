"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, displayName } from "@/lib/supabase";
import { createTeam, requestJoinTeam, acceptRequest, rejectRequest, kickMember, getTeamMemberCount } from "@/lib/teams";
import Nav from "@/components/Nav";

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"list" | "manage">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [adminTeamIds, setAdminTeamIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setMyId(user.id);
    const { data } = await supabase.from("teams").select("*").order("created_at", { ascending: false }).limit(40);
    setTeams(data || []);
    const map: Record<string, number> = {};
    for (const t of data || []) {
      map[t.id] = await getTeamMemberCount(t.id);
    }
    setCounts(map);
    const { data: myMem } = await supabase.from("team_members").select("team_id, role").eq("user_id", user.id);
    const admins = new Set<string>();
    (myMem || []).forEach((m: any) => { if (m.role === "admin") admins.add(m.team_id); });
    (data || []).forEach((t: any) => { if (t.owner_id === user.id || t.leader_id === user.id) admins.add(t.id); });
    setAdminTeamIds(admins);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!myId || !name.trim()) return;
    setErr(""); setMsg("");
    const res = await createTeam(myId, name, desc);
    if (!res.ok) { setErr(res.error || "Failed"); return; }
    setName(""); setDesc(""); setMsg("Team created");
    await load();
  }

  async function requestJoin(teamId: string) {
    if (!myId) return;
    setErr(""); setMsg("");
    const res = await requestJoinTeam(teamId, myId);
    if (!res.ok) setErr(res.error || "Failed");
    else setMsg("Request sent");
  }

  async function openManage(teamId: string) {
    setSelected(teamId);
    setTab("manage");
    const { data: reqs } = await supabase
      .from("team_requests")
      .select("id, user_id, status, created_at")
      .eq("team_id", teamId)
      .eq("status", "pending");
    const uids = (reqs || []).map((r: any) => r.user_id);
    let profiles: any[] = [];
    if (uids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, username").in("id", uids);
      profiles = ps || [];
    }
    const pmap: Record<string, any> = {};
    profiles.forEach(p => { pmap[p.id] = p; });
    setRequests((reqs || []).map((r: any) => ({ ...r, profile: pmap[r.user_id] })));

    const { data: mems } = await supabase.from("team_members").select("user_id, role").eq("team_id", teamId);
    const mids = (mems || []).map((m: any) => m.user_id);
    let mprofiles: any[] = [];
    if (mids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, username").in("id", mids);
      mprofiles = ps || [];
    }
    const mmap: Record<string, any> = {};
    mprofiles.forEach(p => { mmap[p.id] = p; });
    setMembers((mems || []).map((m: any) => ({ ...m, profile: mmap[m.user_id] })));
  }

  async function doAccept(rid: string) {
    if (!myId) return;
    const res = await acceptRequest(rid, myId);
    if (!res.ok) setErr(res.error || "Failed");
    else setMsg("Accepted");
    if (selected) openManage(selected);
    await load();
  }

  async function doReject(rid: string) {
    await rejectRequest(rid);
    setMsg("Rejected");
    if (selected) openManage(selected);
  }

  async function doKick(uid: string) {
    if (!myId || !selected) return;
    const res = await kickMember(selected, uid, myId);
    if (!res.ok) setErr(res.error || "Failed");
    else setMsg("Removed");
    openManage(selected);
    await load();
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ marginBottom: 12 }}>Teams</h1>
        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}

        {tab === "list" && (
          <>
            <div className="card stack" style={{ marginBottom: 14 }}>
              <input placeholder="Team name" value={name} onChange={e => setName(e.target.value)} />
              <textarea placeholder="What are you building?" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
              <button className="btn btn-sm" onClick={create} disabled={!name.trim()}>Create team (max 4)</button>
            </div>
            {teams.map(t => {
              const isOwner = adminTeamIds.has(t.id) || t.owner_id === myId || t.leader_id === myId;
              const full = (counts[t.id] || 0) >= 4;
              return (
                <div key={t.id} className="card" style={{ marginBottom: 10 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="h2">{t.name}</div>
                    <span className="badge">{counts[t.id] || 0}/4</span>
                  </div>
                  {t.description && <p className="muted" style={{ fontSize: 13 }}>{t.description}</p>}
                  <div className="row" style={{ marginTop: 8, gap: 8 }}>
                    {!isOwner && !full && (
                      <button className="btn-ghost btn-sm" onClick={() => requestJoin(t.id)}>Request to join</button>
                    )}
                    {full && !isOwner && <span className="muted" style={{ fontSize: 12 }}>Full</span>}
                    {isOwner && (
                      <button className="btn-ghost btn-sm" onClick={() => openManage(t.id)}>Manage</button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "manage" && selected && (
          <>
            <button className="btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setTab("list")}>← Back</button>
            <h2 className="h2" style={{ marginBottom: 8 }}>Pending requests</h2>
            {requests.length === 0 && <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>No pending requests</p>}
            {requests.map(r => (
              <div key={r.id} className="card row" style={{ marginBottom: 8, justifyContent: "space-between" }}>
                <span>{displayName(r.profile || {})}</span>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-sm" onClick={() => doAccept(r.id)}>Accept</button>
                  <button className="btn-danger" onClick={() => doReject(r.id)}>Reject</button>
                </div>
              </div>
            ))}
            <h2 className="h2" style={{ margin: "16px 0 8px" }}>Members</h2>
            {members.map(m => (
              <div key={m.user_id} className="card row" style={{ marginBottom: 8, justifyContent: "space-between" }}>
                <span>{displayName(m.profile || {})} · {m.role}</span>
                {m.user_id !== myId && (
                  <button className="btn-danger" onClick={() => doKick(m.user_id)}>Kick</button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
      <Nav />
    </div>
  );
}
