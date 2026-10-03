"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  PRODUCTS, ProductId, UPI_DISPLAY, upiPayUrl,
  validateCoupon, priceAfterCoupon, submitPaymentOrder,
} from "@/lib/membership";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

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
  const [rzReady, setRzReady] = useState(false);

  const amount = priceAfterCoupon(p.amount, discount);
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

  useEffect(() => {
    if (publicKey) loadRazorpayScript().then(setRzReady);
  }, [publicKey]);

  async function applyCoupon() {
    const res = await validateCoupon(coupon, product);
    if (!res.ok) { setErr(res.error || "Bad code"); setDiscount(0); setCouponOk(""); return; }
    setDiscount(res.discount_pct);
    setCouponOk(`Code applied · ${res.discount_pct}% off`);
    setErr("");
  }

  async function redeemFreeCoupon() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/membership/redeem", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          product,
          coupon: coupon.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Redeem failed — set SUPABASE_SERVICE_ROLE_KEY");
        setBusy(false);
        return;
      }
      setMsg("Unlocked with coupon!");
      onUnlocked?.();
    } catch (e: any) {
      setErr(e?.message || "Redeem error");
    }
    setBusy(false);
  }

  async function payRazorpay() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          product,
          amount_inr: amount,
          user_id: userId,
          coupon: couponOk ? coupon.trim().toUpperCase() : undefined,
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        setErr(order.error || "Could not start Razorpay");
        setBusy(false);
        return;
      }

      const okScript = await loadRazorpayScript();
      if (!okScript || !window.Razorpay) {
        setErr("Razorpay failed to load — use UPI below");
        setBusy(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: order.key_id || publicKey,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Hatch",
        description: p.name,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            const vRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: await authHeaders(),
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                product,
                user_id: userId,
                amount_inr: amount,
                coupon: couponOk ? coupon.trim().toUpperCase() : undefined,
              }),
            });
            const v = await vRes.json();
            if (!vRes.ok || !v.verified) {
              setErr(v.error || "Payment verify failed");
              setBusy(false);
              return;
            }
            setMsg("Payment success · unlocked!");
            onUnlocked?.();
          } catch (e: any) {
            setErr(e?.message || "Verify error");
          }
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
        theme: { color: "#8b5cf6" },
      });
      rzp.on("payment.failed", (resp: any) => {
        setErr(resp?.error?.description || "Payment failed");
        setBusy(false);
      });
      rzp.open();
    } catch (e: any) {
      setErr(e?.message || "Payment error");
      setBusy(false);
    }
  }

  async function submitUpi() {
    if (amount === 0) {
      await redeemFreeCoupon();
      return;
    }
    setBusy(true); setErr(""); setMsg("");
    const res = await submitPaymentOrder(
      userId,
      product,
      amount,
      ref,
      couponOk ? coupon.trim().toUpperCase() : undefined
    );
    setBusy(false);
    if (!res.ok) setErr(res.error || "Failed");
    else setMsg("UPI submitted · admin will approve soon");
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

      {msg && <div className="ok">{msg}</div>}
      {err && <div className="fail">{err}</div>}

      {amount === 0 ? (
        <button className="btn" disabled={busy} onClick={redeemFreeCoupon}>Unlock free with coupon</button>
      ) : (
        <>
          {publicKey ? (
            <button className="btn" disabled={busy} onClick={payRazorpay}>
              {busy ? "Opening Razorpay…" : `Pay ₹${amount} with Razorpay`}
            </button>
          ) : (
            <p className="muted" style={{ fontSize: 12 }}>
              Add Razorpay keys on Vercel for instant pay — UPI fallback below.
            </p>
          )}

          <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>or pay via UPI</p>
          <p className="muted" style={{ fontSize: 12 }}>
            Pay <strong>₹{amount}</strong> to <strong>{UPI_DISPLAY}</strong>
          </p>
          <a className="btn-ghost" href={upiPayUrl(amount, `Hatch ${p.id}`)} style={{ textAlign: "center" }}>
            Open UPI app
          </a>
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Paste UPI / UTR reference" />
          <button className="btn-ghost" disabled={busy} onClick={submitUpi}>
            I paid UPI · submit for approval
          </button>
        </>
      )}

      <p className="muted" style={{ fontSize: 11 }}>
        Payments verified on server. Coupons redeemed on server. {rzReady ? "Checkout ready." : ""}
      </p>
    </div>
  );
}
