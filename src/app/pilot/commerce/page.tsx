"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSuperAdmin, displayName } from "@/lib/supabase";
import {
  listPendingOrders, approveOrder, rejectOrder,
  createCoupon, listCoupons, toggleCoupon,
} from "@/lib/membership";

export default function PilotCommercePage() {
  const [email, setEmail] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [product, setProduct] = useState("sparks");
  const [pct, setPct] = useState("100");
  const [maxUses, setMaxUses] = useState("50");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh() {
    setOrders(await listPendingOrders());
    setCoupons(await listCoupons());
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isSuperAdmin(user.email)) { router.replace("/home"); return; }
      setEmail(user.email || "");
      setAdminId(user.id);
      await refresh();
      setLoading(false);
    })();
  }, [router]);

  async function makeCoupon() {
    const res = await createCoupon(email, {
      code,
      product,
      discount_pct: parseInt(pct, 10) || 100,
      max_uses: parseInt(maxUses, 10) || 50,
    });
    if (!res.ok) setMsg(res.error || "Failed");
    else { setMsg("Coupon " + code.toUpperCase() + " created"); setCode(""); await refresh(); }
  }

  if (loading) {
    return <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><span className="muted">…</span></div>;
  }

  return (
    <div className="shell" style={{ background: "#050508" }}>
      <div className="topbar" style={{ background: "linear-gradient(90deg,#7c3aed,#db2777)", border: "none" }}>
        <Link href="/pilot" className="btn-ghost btn-sm" style={{ color: "#fff" }}>← Pilot</Link>
        <div style={{ fontWeight: 900, color: "#fff", fontSize: 14 }}>Money · Coupons</div>
      </div>
      <div className="page">
        {msg && <div className="ok" style={{ marginBottom: 10 }}>{msg}</div>}

        <div className="card stack" style={{ marginBottom: 14 }}>
          <div className="h2">Create coupon</div>
          <p className="muted" style={{ fontSize: 12 }}>100% off = instant unlock. Product: sparks · legends · premium · any</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code e.g. BMSCE150" />
          <select value={product} onChange={(e) => setProduct(e.target.value)}>
            <option value="sparks">sparks (₹150 dating)</option>
            <option value="legends">legends (₹999)</option>
            <option value="premium">premium (₹120)</option>
            <option value="any">any product</option>
          </select>
          <input value={pct} onChange={(e) => setPct(e.target.value)} placeholder="Discount %" type="number" />
          <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Max uses" type="number" />
          <button className="btn" onClick={makeCoupon}>Create code</button>
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Your codes</div>
          {coupons.map((c) => (
            <div key={c.code} className="row" style={{ marginBottom: 8, alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <strong>{c.code}</strong>
                <p className="muted" style={{ fontSize: 11 }}>
                  {c.product} · {c.discount_pct}% · {c.used_count}/{c.max_uses} · {c.active ? "ON" : "OFF"}
                </p>
              </div>
              <button className="btn-ghost btn-sm" onClick={async () => {
                await toggleCoupon(c.code, !c.active, email);
                await refresh();
              }}>{c.active ? "Disable" : "Enable"}</button>
            </div>
          ))}
          {!coupons.length && <p className="muted" style={{ fontSize: 12 }}>No codes yet</p>}
        </div>

        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>Pending UPI payments</div>
          {orders.map((o) => (
            <div key={o.id} style={{ marginBottom: 12, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <div style={{ fontWeight: 700 }}>{displayName(o.profile || {})}</div>
              <p className="muted" style={{ fontSize: 12 }}>
                {o.product} · ₹{o.amount_inr} · ref {o.upi_ref}
                {o.coupon_code ? ` · coupon ${o.coupon_code}` : ""}
              </p>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button className="btn btn-sm" onClick={async () => {
                  if (!adminId) return;
                  await approveOrder(o.id, adminId, email);
                  setMsg("Approved");
                  await refresh();
                }}>Approve</button>
                <button className="btn-ghost btn-sm" onClick={async () => {
                  if (!adminId) return;
                  await rejectOrder(o.id, adminId, email);
                  setMsg("Rejected");
                  await refresh();
                }}>Reject</button>
              </div>
            </div>
          ))}
          {!orders.length && <p className="muted" style={{ fontSize: 12 }}>No pending payments</p>}
        </div>
      </div>
    </div>
  );
}
