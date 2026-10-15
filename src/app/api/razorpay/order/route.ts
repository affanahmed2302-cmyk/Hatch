import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Create Razorpay order for Pass Drops / Hatch Pro.
 * Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 * Amount always in paise (INR * 100).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const amountPaise = Number(body.amountPaise || body.amount || 0)
    const receipt = String(body.receipt || `hatch_${Date.now()}`).slice(0, 40)
    const notes = body.notes || {}

    if (!amountPaise || amountPaise < 100) {
      return NextResponse.json({ ok: false, error: 'amountPaise min 100 (₹1)' }, { status: 400 })
    }

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      return NextResponse.json({
        ok: false,
        error: 'Razorpay not configured — set RAZORPAY_KEY_ID / SECRET on Vercel',
        stub: true,
      })
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data?.error?.description || 'Order failed' }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Order failed' }, { status: 500 })
  }
}

/** Verify payment signature after checkout */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return NextResponse.json({ ok: false, error: 'Not configured' }, { status: 500 })
    }
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const ok = expected === razorpay_signature
    return NextResponse.json({ ok, verified: ok })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
