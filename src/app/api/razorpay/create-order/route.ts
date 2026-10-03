import { NextRequest, NextResponse } from "next/server";
import { requireUser, apiRateLimit, securityHeaders } from "@/lib/security";

const PRODUCTS: Record<string, { amount: number; name: string }> = {
  sparks: { amount: 150, name: "Campus Sparks" },
  legends: { amount: 999, name: "Legends of BMSCE" },
  premium: { amount: 120, name: "Hatch Premium" },
};

export async function POST(req: NextRequest) {
  const headers = securityHeaders();
  try {
    const { user, error: authErr } = await requireUser(req);
    if (!user) {
      return NextResponse.json({ error: authErr || "Unauthorized" }, { status: 401, headers });
    }
    if (!apiRateLimit(`rzp-order:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys not configured on server" },
        { status: 503, headers }
      );
    }

    const body = await req.json();
    const product = String(body.product || "");
    const amountInr = Number(body.amount_inr);
    const userId = String(body.user_id || "");
    const coupon = body.coupon ? String(body.coupon) : "";

    // Never trust client user_id — must match session
    if (userId !== user.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403, headers });
    }
    if (!PRODUCTS[product]) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400, headers });
    }
    if (!Number.isFinite(amountInr) || amountInr < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400, headers });
    }
    if (amountInr > PRODUCTS[product].amount) {
      return NextResponse.json({ error: "Amount too high" }, { status: 400, headers });
    }

    const amountPaise = Math.round(amountInr * 100);
    const receipt = `hatch_${product}_${userId.slice(0, 8)}_${Date.now()}`.slice(0, 40);

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt,
        notes: {
          product,
          user_id: userId,
          coupon: coupon || "",
          app: "hatch",
        },
      }),
    });

    const data = await rzRes.json();
    if (!rzRes.ok) {
      return NextResponse.json(
        { error: data?.error?.description || "Razorpay order failed" },
        { status: 400, headers }
      );
    }

    return NextResponse.json(
      {
        order_id: data.id,
        amount: data.amount,
        currency: data.currency,
        key_id: keyId,
        product,
        amount_inr: amountInr,
      },
      { headers }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500, headers });
  }
}
