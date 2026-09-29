"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, displayName, handleOf, yearToLabel } from "@/lib/supabase";
import Nav from "@/components/Nav";

export default function Discover() {
  const [tab, setTab] = useState<"discover" | "pending" | "matches">("discover");
  const [people, setPeople] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [pendingIn, setPendingIn] = useState<any[]>([]);
  const [pendingOut, setPendingOut] = useState<string[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setMyId(user.id);

    const { data: all } = await supabase.from("profiles")
      .select("id, full_name, username, bio, department, year, skills, avatar_url, tech_stack, intent")
      .neq("id", user.id)
      .order("updated_at", { ascending: false })
      .limit(60);
    setPeople(all || []);

    const { data: cons } = await supabase.from("connections")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    const accepted = (cons || []).filter((c: any) => c.status === "accepted");
    const pending = (cons || []).filter((c: any) => c.status === "pending");

    const matchIds = accepted.map((c: any) => c.user_a === user.id ? c.user_b : c.user_a);
    if (matchIds.length) {
      const { data: ms } = await supabase.from("profiles").select("*").in("id", matchIds);
      setMatches(ms || []);
    } else setMatches([]);

    const incoming = pending.filter((c: any) => c.requested_by !== user.id);
    const outIds = pending.filter((c: any) => c.requested_by === user.id).map((c: any) =>
      c.user_a === user.id ? c.user_b : c.user_a
    );
    setPendingOut(outIds);

    const inIds = incoming.map((c: any) => c.user_a === user.id ? c.user_b : c.user_a);
    if (inIds.length) {
      const { data: ins } = await supabase.from("profiles").select("*").in("id", inIds);
      setPendingIn(ins || []);
    } else setPendingIn([]);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function connect(peerId: string) {
    if (!myId) return;
    setErr(""); setMsg("");
    const [a, b] = [myId, peerId].sort();
    const { error } = await supabase.from("connections").upsert({
      user_a: a, user_b: b, status: "pending", requested_by: myId,
    }, { onConflict: "user_a,user_b" });
    if (error) {
      setErr(error.message.includes("schema") || error.message.includes("relation")
        ? "Connections table missing — run SQL"
        : error.message);
      return;
    }
    setMsg("Connect request sent");
    setPendingOut((prev) => [...prev, peerId]);
  }

  async function accept(peerId: string) {
    if (!myId) return;
    const [a, b] = [myId, peerId].sort();
    const { error } = await supabase.from("connections")
      .update({ status: "accepted" })
      .eq("user_a", a).eq("user_b", b);
    if (error) { setErr(error.message); return; }
    setMsg("Connected");
    await load();
  }

  async function reject(peerId: string) {
    if (!myId) return;
    const [a, b] = [myId, peerId].sort();
    await supabase.from("connections").delete().eq("user_a", a).eq("user_b", b);
    setMsg("Declined");
    await load();
  }

  const filtered = people.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(s) ||
      (p.username || "").toLowerCase().includes(s) ||
      (p.bio || "").toLowerCase().includes(s) ||
      (p.department || "").toLowerCase().includes(s) ||
      (p.tech_stack || "").toLowerCase().includes(s)
    );
  });

  const matchIdSet = new Set(matches.map((m) => m.id));

  if (loading) {
    return (
      <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Loading...</span>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar"><div className="logo">HATCH</div></div>
      <div className="page">
        <h1 className="h1" style={{ fontSize: 22, marginBottom: 8 }}>Connect</h1>
        <input
          placeholder="Search name, skill, branch..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button className={`chip ${tab === "discover" ? "on" : ""}`} onClick={() => setTab("discover")}>
            Discover ({filtered.length})
          </button>
          <button className={`chip ${tab === "pending" ? "on" : ""}`} onClick={() => setTab("pending")}>
            Requests ({pendingIn.length})
          </button>
          <button className={`chip ${tab === "matches" ? "on" : ""}`} onClick={() => setTab("matches")}>
            Connected ({matches.length})
          </button>
        </div>

        {msg && <div className="ok" style={{ marginBottom: 8 }}>{msg}</div>}
        {err && <div className="fail" style={{ marginBottom: 8 }}>{err}</div>}

        {tab === "pending" && (
          <>
            {pendingIn.length === 0 && <div className="empty"><p>No incoming requests</p></div>}
            {pendingIn.map((p) => (
              <div key={p.id} className="card" style={{ marginBottom: 10 }}>
                <div className="row" style={{ gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                    background: p.avatar_url ? "url(" + p.avatar_url + ") center/cover" : "var(--grad-cool)",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{handleOf(p)} · {p.department || "BMS"}</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn btn-sm" onClick={() => accept(p.id)}>Accept</button>
                  <button className="btn-ghost btn-sm" onClick={() => reject(p.id)}>Decline</button>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "matches" && (
          <>
            {matches.length === 0 && <div className="empty"><p>No connections yet</p></div>}
            {matches.map((p) => (
              <div key={p.id} className="card" style={{ marginBottom: 10 }}>
                <div className="row" style={{ gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                    background: p.avatar_url ? "url(" + p.avatar_url + ") center/cover" : "var(--grad-cool)",
                  }} />
                  <div style={{ flex: 1 }}>
                    <div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{handleOf(p)}</div>
                  </div>
                </div>
                <Link href={"/chat/" + p.id} className="btn btn-sm" style={{ marginTop: 10, display: "inline-block" }}>
                  Open chat
                </Link>
              </div>
            ))}
          </>
        )}

        {tab === "discover" && (
          <>
            {filtered.map((p) => {
              const connected = matchIdSet.has(p.id);
              const requested = pendingOut.includes(p.id);
              return (
                <div key={p.id} className="card" style={{ marginBottom: 10 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                      background: p.avatar_url ? "url(" + p.avatar_url + ") center/cover" : "var(--grad-cool)",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="h2" style={{ fontSize: 15 }}>{displayName(p)}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {handleOf(p)} · {p.department || "BMS"} {yearToLabel(p.year)}
                      </div>
                      {p.bio && <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>{p.bio.slice(0, 120)}</p>}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 12 }}>
                    {connected ? (
                      <Link href={"/chat/" + p.id} className="btn btn-sm">Chat</Link>
                    ) : requested ? (
                      <button className="btn-ghost btn-sm" disabled>Requested</button>
                    ) : (
                      <button className="btn btn-sm" onClick={() => connect(p.id)}>Connect</button>
                    )}
                    <Link href={"/chat/" + p.id} className="btn-ghost btn-sm">Message</Link>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="empty"><p>No students match that search</p></div>}
          </>
        )}
      </div>
      <Nav />
    </div>
  );
}
