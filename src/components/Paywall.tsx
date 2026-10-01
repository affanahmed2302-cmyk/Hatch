"use client";
import { useState } from "react";
import {
  PRODUCTS, ProductId, UPI_DISPLAY, UPI_NUMBER, upiPayUrl,
  validateCoupon, priceAfterCoupon, submitPaymentOrder,
} from "@/lib/membership";

export default function Paywall({
  product,
  userId,
  onUnlocked,
  bullets,
}: {
  product: ProductId;
  userId: string;
  onUnlocked?: () => void;
  bullets: string[];
}) {
  const p = PRODUCTS[product];
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponOk, setCouponOk] = useState("");
  const [ref, setRef] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = priceAfterCoupon(p.amount, discount);

  async function applyCoupon() {
    const res = await validateCoupon(coupon, product);
    if (!res.ok) { setErr(res.error || "Bad code"); setDiscount(0); setCouponOk(""); return; }
    setDiscount(res.discount_pct);
    setCouponOk(`Code applied · ${res.discount_pct}% off`);
    setErr("");
  }

  async function submit() {
    setBusy(true); setErr(""); setMsg("");
    const res = await submitPaymentOrder(
      userId,
      product,
      amount,
      amount === 0 ? "FREE" : ref,
      couponOk ? coupon.trim().toUpperCase() : undefined
    );
    setBusy(false);
    if (!res.ok) setErr(res.error || "Failed — run hatch_membership.sql");
    else if (amount === 0) {
      setMsg("Unlocked with coupon!");
      onUnlocked?.();
    } else {
      setMsg("Payment submitted · usually approved within a few hours");
    }
  }

  return (
    <div className="card stack" style={{
      border: "1px solid rgba(251,191,36,0.4)",
      background: "linear-gradient(160deg,rgba(251,191,36,0.12),rgba(139,92,246,0.08))",
    }}>
      <div style={{ fontWeight: 900, fontSize: 20 }}>{p.name}</div>
      <p className="muted" style={{ fontSize: 13 }}>{p.tagline}</p>
      <div style={{ fontWeight: 800, fontSize: 28 }}>{p.label}</div>
      <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
        {bullets.map((b) => <li key={b}>{b}</li>)}
      </ul>

      <div className="row" style={{ gap: 8 }}>
        <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" style={{ flex: 1 }} />
        <button className="btn-ghost btn-sm" type="button" onClick={applyCoupon}>Apply</button>
      </div>
      {couponOk && <div className="ok">{couponOk} · pay ₹{amount}</div>}

      {amount > 0 && (
        <>
          <p className="muted" style={{ fontSize: 12 }}>
            Pay <strong>₹{amount}</strong> to UPI <strong>{UPI_DISPLAY}</strong> ({UPI_NUMBER})
          </p>
          <a className="btn" href={upiPayUrl(amount, `Hatch ${p.id}`)} style={{ textAlign: "center" }}>
            Open UPI app · pay ₹{amount}
          </a>
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Paste UPI / UTR reference" />
        </>
      )}

      {msg && <div className="ok">{msg}</div>}
      {err && <div className="fail">{err}</div>}
      <button className="btn" disabled={busy} onClick={submit}>
        {amount === 0 ? "Unlock free with coupon" : "I paid · submit for approval"}
      </button>
      <p className="muted" style={{ fontSize: 11 }}>
        Auto-unlock when coupon is 100% off. Paid orders approved by admin (or Razorpay when keys are added).
      </p>
    </div>
  );
}
