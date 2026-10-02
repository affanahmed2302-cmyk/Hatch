import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const PRODUCTS: Record<string, { amount: number; days: number }> = {
  sparks: { amount: 150, days: 30 },
  legends: { amount: 999, days: 30 },
  premium: { amount: 120, days: 30 },
};

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ahtabgrlkyjjjqxvndlb.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_3YcwyaHxFjIcacIPNsxDWQ_IreLbFRE";
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay secret missing" }, { status: 503 });
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

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }
    if (!PRODUCTS[product] || !user_id) {
      return NextResponse.json({ error: "Invalid product or user" }, { status: 400 });
    }

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const days = PRODUCTS[product].days;
    const ends = new Date(Date.now() + days * 86400000).toISOString();
    const amount = Number(amount_inr) || PRODUCTS[product].amount;
    const sb = supabaseAdmin();

    const { error: memErr } = await sb.from("memberships").insert({
      user_id,
      product,
      status: "active",
      ends_at: ends,
      amount_inr: amount,
      coupon_code: coupon || null,
      payment_ref: razorpay_payment_id,
    });

    if (memErr) {
      // still mark verified — client can retry activate
      return NextResponse.json({
        ok: true,
        verified: true,
        membership_error: memErr.message,
        ends,
        payment_id: razorpay_payment_id,
      });
    }

    if (product === "premium") {
      await sb
        .from("profiles")
        .update({
          is_premium: true,
          premium_until: ends,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);
    }

    if (coupon) {
      const { data: c } = await sb.from("coupons").select("used_count").eq("code", coupon).maybeSingle();
      if (c) {
        await sb.from("coupons").update({ used_count: (c.used_count || 0) + 1 }).eq("code", coupon);
      }
    }

    await sb.from("payment_orders").insert({
      user_id,
      product,
      amount_inr: amount,
      coupon_code: coupon || null,
      upi_ref: razorpay_payment_id,
      status: "approved",
      reviewed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      verified: true,
      ends,
      payment_id: razorpay_payment_id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Verify failed" }, { status: 500 });
  }
}
