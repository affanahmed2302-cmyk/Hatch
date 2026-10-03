import { NextRequest, NextResponse } from "next/server";
import { requireUser, apiRateLimit, securityHeaders, supabaseService } from "@/lib/security";

const PRODUCTS: Record<string, { days: number; amount: number }> = {
  sparks: { days: 30, amount: 150 },
  legends: { days: 30, amount: 999 },
  premium: { days: 30, amount: 120 },
};

/** Server-side coupon redeem — clients cannot insert memberships after hatch_security.sql */
export async function POST(req: NextRequest) {
  const headers = securityHeaders();
  try {
    const { user, error: authErr } = await requireUser(req);
    if (!user) {
      return NextResponse.json({ error: authErr || "Unauthorized" }, { status: 401, headers });
    }
    if (!apiRateLimit(`redeem:${user.id}`, 8, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
    }

    const sb = supabaseService();
    if (!sb) {
      return NextResponse.json(
        { error: "Set SUPABASE_SERVICE_ROLE_KEY on Vercel" },
        { status: 503, headers }
      );
    }

    const body = await req.json();
    const product = String(body.product || "");
    const code = String(body.coupon || "").trim().toUpperCase();

    if (!PRODUCTS[product]) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400, headers });
    }
    if (code.length < 3) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400, headers });
    }

    const { data: coupon } = await sb.from("coupons").select("*").eq("code", code).maybeSingle();
    if (!coupon || !coupon.active) {
      return NextResponse.json({ error: "Invalid or inactive code" }, { status: 400, headers });
    }
    if (coupon.product !== product && coupon.product !== "any") {
      return NextResponse.json({ error: "Code not valid for this product" }, { status: 400, headers });
    }
    if ((coupon.used_count || 0) >= (coupon.max_uses || 0)) {
      return NextResponse.json({ error: "Code fully used" }, { status: 400, headers });
    }

    const pct = Math.max(0, Math.min(100, Number(coupon.discount_pct) || 0));
    if (pct < 100) {
      return NextResponse.json(
        { error: "This code is a discount — complete payment in app", discount_pct: pct },
        { status: 400, headers }
      );
    }

    const days = PRODUCTS[product].days;
    const ends = new Date(Date.now() + days * 86400000).toISOString();

    const { error: memErr } = await sb.from("memberships").insert({
      user_id: user.id,
      product,
      status: "active",
      ends_at: ends,
      amount_inr: 0,
      coupon_code: code,
      payment_ref: "COUPON",
    });
    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 400, headers });
    }

    await sb
      .from("coupons")
      .update({ used_count: (coupon.used_count || 0) + 1 })
      .eq("code", code);

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

    return NextResponse.json({ ok: true, ends, product }, { headers });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Redeem failed" }, { status: 500, headers });
  }
}
