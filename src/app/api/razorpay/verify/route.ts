import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireUser, apiRateLimit, securityHeaders, supabaseService } from "@/lib/security";

const PRODUCTS: Record<string, { amount: number; days: number }> = {
  sparks: { amount: 150, days: 30 },
  legends: { amount: 999, days: 30 },
  premium: { amount: 120, days: 30 },
};

export async function POST(req: NextRequest) {
  const headers = securityHeaders();
  try {
    const { user, error: authErr } = await requireUser(req);
    if (!user) {
      return NextResponse.json({ error: authErr || "Unauthorized" }, { status: 401, headers });
    }
    if (!apiRateLimit(`rzp-verify:${user.id}`, 15, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay secret missing" }, { status: 503, headers });
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      product,
      user_id,
      amount_inr,
      coupon,
    } = body;

    if (user_id !== user.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403, headers });
    }
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400, headers });
    }
    if (!PRODUCTS[product]) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400, headers });
    }

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400, headers });
    }

    const sb = supabaseService();
    if (!sb) {
      return NextResponse.json(
        { error: "Server misconfigured: set SUPABASE_SERVICE_ROLE_KEY on Vercel" },
        { status: 503, headers }
      );
    }

    const days = PRODUCTS[product].days;
    const ends = new Date(Date.now() + days * 86400000).toISOString();
    const amount = Math.min(
      Number(amount_inr) || PRODUCTS[product].amount,
      PRODUCTS[product].amount
    );

    const { error: memErr } = await sb.from("memberships").insert({
      user_id: user.id,
      product,
      status: "active",
      ends_at: ends,
      amount_inr: amount,
      coupon_code: coupon || null,
      payment_ref: razorpay_payment_id,
    });

    if (memErr && !String(memErr.message).toLowerCase().includes("duplicate")) {
      return NextResponse.json(
        { ok: false, error: memErr.message },
        { status: 400, headers }
      );
    }

    if (product === "premium") {
      await sb
        .from("profiles")
        .update({
          is_premium: true,
          premium_until: ends,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    if (coupon) {
      const { data: c } = await sb.from("coupons").select("used_count").eq("code", String(coupon).toUpperCase()).maybeSingle();
      if (c) {
        await sb
          .from("coupons")
          .update({ used_count: (c.used_count || 0) + 1 })
          .eq("code", String(coupon).toUpperCase());
      }
    }

    await sb.from("payment_orders").insert({
      user_id: user.id,
      product,
      amount_inr: amount,
      coupon_code: coupon || null,
      upi_ref: razorpay_payment_id,
      status: "approved",
      reviewed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { ok: true, verified: true, ends, payment_id: razorpay_payment_id },
      { headers }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Verify failed" }, { status: 500, headers });
  }
}
