"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, displayName } from "@/lib/supabase";
import {
  createTeam, requestJoinTeam, acceptRequest, rejectRequest, kickMember,
  getTeamMemberCount, fetchTeamMessages, sendTeamMessage,
} from "@/lib/teams";
import Nav from "@/components/Nav";

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [size, setSize] = useState(4);
  const [myId, setMyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"list" | "manage">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [adminTeamIds, setAdminTeamIds] = useState<Set<string>>(new Set());
  const [memberTeamIds, setMemberTeamIds] = useState<Set<string>>(new Set());
  const [chatMsgs, setChatMsgs] = useState<any[]>([]);
  const [chatText, setChatText] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
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
    const mems = new Set<string>();
    (myMem || []).forEach((m: any) => {
      mems.add(m.team_id);
      if (m.role === "admin") admins.add(m.team_id);
    });
    (data || []).forEach((t: any) => {
      if (t.owner_id === user.id || t.leader_id === user.id) {
        admins.add(t.id);
        mems.add(t.id);
      }
    });
    setAdminTeamIds(admins);
    setMemberTeamIds(mems);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!myId || !name.trim()) return;
    setErr(""); setMsg("");
    const res = await createTeam(myId, name, desc, size);
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
    setErr(""); setMsg("");
    const { data: reqs } = await supabase
      .from("team_requests")
      .select("id, user_id, status, created_at")
      .eq("team_id", teamId)
      .eq("status", "pending");
    const { data: mems } = await supabase.from("team_members").select("user_id, role").eq("team_id", teamId);
    const ids = [
      ...(reqs || []).map((r: any) => r.user_id),
      ...(mems || []).map((m: any) => m.user_id),
    ];
    const uniq = [...new Set(ids)];
    let nameMap: Record<string, string> = {};
    if (uniq.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, username").in("id", uniq);
      (profiles || []).forEach((p: any) => {
        nameMap[p.id] = displayName(p);
      });
    }
    setNames(nameMap);
    setRequests((reqs || []).map((r: any) => ({ ...r, name: nameMap[r.user_id] || "Student" })));
    setMembers((mems || []).map((m: any) => ({ ...m, name: nameMap[m.user_id] || "Student" })));

    const chat = await fetchTeamMessages(teamId);
    if (chat.ok) {
      const sids = [...new Set((chat.data || []).map((m: any) => m.sender_id))];
      if (sids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, full_name, username").in("id", sids);
        (ps || []).forEach((p: any) => { nameMap[p.id] = displayName(p); });
        setNames({ ...nameMap });
      }
      setChatMsgs(chat.data || []);
    } else {
      setChatMsgs([]);
    }
  }

  async function doAccept(id: string) {
    if (!myId) return;
    const res = await acceptRequest(id, myId);
    if (!res.ok) setErr(res.error || "Failed");
    else setMsg("Accepted");
    if (selected) openManage(selected);
    load();
  }

  async function doReject(id: string) {
    const res = await rejectRequest(id);
    if (!res.ok) setErr(res.error || "Failed");
    if (selected) openManage(selected);
  }

  async function doKick(uid: string) {
    if (!myId || !selected) return;
    const res = await kickMember(selected, uid, myId);
    if (!res.ok) setErr(res.error || "Failed");
    openManage(selected);
    load();
  }

  async function sendChat() {
    if (!myId || !selected || !chatText.trim()) return;
    const res = await sendTeamMessage(selected, myId, chatText);
    if (!res.ok) { setErr(res.error || "Send failed"); return; }
    setChatText("");
    const chat = await fetchTeamMessages(selected);
    if (chat.ok) setChatMsgs(chat.data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    if (!selected) return;
    const ch = supabase
      .channel(`team-chat-${selected}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${selected}` },
        async (payload) => {
          const row = payload.new as any;
          setChatMsgs((prev) => prev.some((m) => m.id === row.id) ? prev : [...prev, row]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        {tab === "list" && (
          <>
            <h1 className="h1" style={{ marginBottom: 12 }}>Teams</h1>
            {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
            {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

            <div className="card stack" style={{ marginBottom: 16 }}>
              <div className="h2">Create team</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Team name" />
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Project / hackathon goal" />
              <div>
                <span className="label">Team size (you decide)</span>
                <select value={size} onChange={e => setSize(Number(e.target.value))}>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n} members</option>
                  ))}
                </select>
              </div>
              <button className="btn" onClick={create} disabled={!name.trim()}>Create</button>
            </div>

            {teams.map(t => {
              const max = t.members_needed || 4;
              const c = counts[t.id] || 0;
              const isAdmin = adminTeamIds.has(t.id);
              const isMember = memberTeamIds.has(t.id);
              return (
                <div key={t.id} className="card" style={{ marginBottom: 10 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="h2">{t.name}</div>
                    <span className="badge">{c}/{max}</span>
                  </div>
                  {t.description && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{t.description}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {isAdmin && (
                      <button className="btn-ghost btn-sm" onClick={() => openManage(t.id)}>Manage</button>
                    )}
                    {isMember && (
                      <button className="btn btn-sm" onClick={() => openManage(t.id)}>Open chat</button>
                    )}
                    {!isMember && c < max && (
                      <button className="btn btn-sm" onClick={() => requestJoin(t.id)}>Request join</button>
                    )}
                    {!isMember && c >= max && (
                      <span className="muted" style={{ fontSize: 12 }}>Full</span>
                    )}
                  </div>
                </div>
              );
            })}
            {teams.length === 0 && <div className="empty"><p>No teams yet — create one</p></div>}
          </>
        )}

        {tab === "manage" && selected && (
          <>
            <button className="btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => { setTab("list"); setSelected(null); }}>← Back</button>
            {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
            {err && <div className="fail" style={{ marginBottom: 10 }}>{err}</div>}

            {adminTeamIds.has(selected) && (
              <>
                <h2 className="h2" style={{ marginBottom: 10 }}>Pending requests</h2>
                {requests.map(r => (
                  <div key={r.id} className="card row" style={{ marginBottom: 8, justifyContent: "space-between" }}>
                    <span>{r.name}</span>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => doAccept(r.id)}>Accept</button>
                      <button className="btn-ghost btn-sm" onClick={() => doReject(r.id)}>Reject</button>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>No pending requests</p>}

                <h2 className="h2" style={{ margin: "16px 0 10px" }}>Members</h2>
                {members.map(m => (
                  <div key={m.user_id} className="card row" style={{ marginBottom: 8, justifyContent: "space-between" }}>
                    <span>{m.name} · {m.role}</span>
                    {m.user_id !== myId && (
                      <button className="btn-ghost btn-sm" onClick={() => doKick(m.user_id)}>Remove</button>
                    )}
                  </div>
                ))}
              </>
            )}

            <h2 className="h2" style={{ margin: "16px 0 10px" }}>Team chat</h2>
            <div className="card" style={{ marginBottom: 10, maxHeight: 280, overflowY: "auto", padding: 12 }}>
              {chatMsgs.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No messages yet — start the discussion</p>}
              {chatMsgs.map(m => (
                <div key={m.id} style={{ marginBottom: 10 }}>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {m.sender_id === myId ? "You" : (names[m.sender_id] || "Member")}
                  </div>
                  <div style={{ fontSize: 14 }}>{m.content}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                style={{ flex: 1 }}
                value={chatText}
                onChange={e => setChatText(e.target.value)}
                placeholder="Message the team…"
                onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
              />
              <button className="btn btn-sm" onClick={sendChat} disabled={!chatText.trim()}>Send</button>
            </div>
          </>
        )}
      </div>
      <Nav />
    </div>
  );
}
