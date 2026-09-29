"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin, displayName } from "@/lib/supabase";
import { listPendingPremium, approvePremium, rejectPremium } from "@/lib/premium";
import Nav from "@/components/Nav";

export default function AdminPremiumPage() {
  const [email, setEmail] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh() {
    setRows(await listPendingPremium());
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      if (!isSuperAdmin(user.email)) { router.push("/home"); return; }
      setEmail(user.email || "");
      setAdminId(user.id);
      await refresh();
      setLoading(false);
    })();
  }, [router]);

  async function approve(id: string) {
    if (!adminId) return;
    const res = await approvePremium(id, adminId, email);
    setMsg(res.ok ? "Approved · membership activated" : res.error || "Failed");
    await refresh();
  }

  async function reject(id: string) {
    if (!adminId) return;
    const res = await rejectPremium(id, adminId, email);
    setMsg(res.ok ? "Rejected" : res.error || "Failed");
    await refresh();
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
        <Link href="/profile" className="btn-ghost btn-sm">←</Link>
        <div className="logo" style={{ fontSize: 14 }}>Premium approvals</div>
      </div>
      <div className="page">
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Pending UPI payments · verify in PhonePe then approve
        </p>
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}
        {rows.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 12 }}>
            <div className="h2" style={{ fontSize: 15 }}>{displayName(r.profile || {})}</div>
            <p className="muted" style={{ fontSize: 12 }}>@{r.profile?.username || "—"} · {r.profile?.email || ""}</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              Plan <strong>{r.plan}</strong> · ₹{r.amount_inr} · ref <strong>{r.upi_ref}</strong>
            </p>
            {r.note && <p className="muted" style={{ fontSize: 12 }}>Note: {r.note}</p>}
            <p className="muted" style={{ fontSize: 11 }}>{new Date(r.created_at).toLocaleString()}</p>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button className="btn btn-sm" onClick={() => approve(r.id)}>Approve</button>
              <button className="btn-ghost btn-sm" onClick={() => reject(r.id)}>Reject</button>
            </div>
          </div>
        ))}
        {!rows.length && <div className="empty"><p>No pending requests</p></div>}
      </div>
      <Nav />
    </div>
  );
}
