import { supabase, isSuperAdmin } from './supabase'

export const UPI_ID = '9480751817@paytm'
export const UPI_NUMBER = '9480751817'
export const UPI_DISPLAY = '+91 9480751817'

export const PRODUCTS = {
  sparks: {
    id: 'sparks' as const,
    name: 'Campus Sparks',
    tagline: 'BMSCE dating · swipe · match · chat',
    amount: 150,
    days: 30,
    label: '₹150 / month',
  },
  legends: {
    id: 'legends' as const,
    name: 'Legends of BMSCE',
    tagline: 'Private society chat for campus legends',
    amount: 999,
    days: 30,
    label: '₹999 / month',
  },
  premium: {
    id: 'premium' as const,
    name: 'Hatch Premium',
    tagline: 'Private Circle + boosts',
    amount: 120,
    days: 30,
    label: '₹120 / month',
  },
} as const

export type ProductId = keyof typeof PRODUCTS

export function upiPayUrl(amount: number, note: string) {
  const pa = UPI_ID
  const pn = encodeURIComponent('Hatch Campus')
  const am = amount.toFixed(2)
  const tn = encodeURIComponent(note.slice(0, 40))
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`
}

export async function hasActiveMembership(userId: string, product: ProductId): Promise<boolean> {
  if (isSuperAdmin((await supabase.auth.getUser()).data.user?.email)) return true
  try {
    const { data } = await supabase
      .from('memberships')
      .select('id, ends_at, status')
      .eq('user_id', userId)
      .eq('product', product)
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .limit(1)
    return !!(data && data.length)
  } catch {
    return false
  }
}

export async function membershipUntil(userId: string, product: ProductId): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('memberships')
      .select('ends_at')
      .eq('user_id', userId)
      .eq('product', product)
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.ends_at || null
  } catch {
    return null
  }
}

export async function validateCoupon(code: string, product: ProductId) {
  const c = code.trim().toUpperCase()
  if (!c) return { ok: false as const, error: 'Enter code', discount_pct: 0 }
  try {
    const { data } = await supabase.from('coupons').select('*').eq('code', c).maybeSingle()
    if (!data || !data.active) return { ok: false as const, error: 'Invalid code', discount_pct: 0 }
    if (data.product !== product && data.product !== 'any') {
      return { ok: false as const, error: 'Code not for this product', discount_pct: 0 }
    }
    if (data.used_count >= data.max_uses) {
      return { ok: false as const, error: 'Code fully used', discount_pct: 0 }
    }
    return { ok: true as const, error: null, discount_pct: data.discount_pct as number, code: c }
  } catch {
    return { ok: false as const, error: 'Could not check code', discount_pct: 0 }
  }
}

export function priceAfterCoupon(base: number, discountPct: number) {
  const p = Math.max(0, Math.min(100, discountPct))
  return Math.round(base * (1 - p / 100))
}

/** Auto-activate when coupon makes amount 0 */
export async function activateMembership(
  userId: string,
  product: ProductId,
  amount: number,
  opts?: { coupon?: string; payment_ref?: string }
) {
  const days = PRODUCTS[product].days
  const ends = new Date(Date.now() + days * 86400000).toISOString()
  try {
    const { error } = await supabase.from('memberships').insert({
      user_id: userId,
      product,
      status: 'active',
      ends_at: ends,
      amount_inr: amount,
      coupon_code: opts?.coupon || null,
      payment_ref: opts?.payment_ref || null,
    })
    if (error) return { ok: false as const, error: error.message, ends: null }
    if (opts?.coupon) {
      const { data: c } = await supabase.from('coupons').select('used_count').eq('code', opts.coupon).maybeSingle()
      if (c) {
        await supabase.from('coupons').update({ used_count: (c.used_count || 0) + 1 }).eq('code', opts.coupon)
      }
    }
    if (product === 'premium') {
      await supabase.from('profiles').update({
        is_premium: true,
        premium_until: ends,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
    }
    return { ok: true as const, error: null, ends }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Activate failed', ends: null }
  }
}

export async function submitPaymentOrder(
  userId: string,
  product: ProductId,
  amount: number,
  upiRef: string,
  coupon?: string
) {
  const ref = (upiRef || '').trim()
  if (amount > 0 && ref.length < 4) {
    return { ok: false as const, error: 'Enter UPI transaction ID / reference' }
  }
  try {
    const { data: pending } = await supabase
      .from('payment_orders')
      .select('id')
      .eq('user_id', userId)
      .eq('product', product)
      .eq('status', 'pending')
      .maybeSingle()
    if (pending) return { ok: false as const, error: 'Already pending — wait for approval or use a full coupon' }

    if (amount === 0) {
      return activateMembership(userId, product, 0, { coupon, payment_ref: 'COUPON' })
    }

    const { error } = await supabase.from('payment_orders').insert({
      user_id: userId,
      product,
      amount_inr: amount,
      coupon_code: coupon || null,
      upi_ref: ref,
      status: 'pending',
    })
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Submit failed' }
  }
}

export async function listPendingOrders() {
  const { data } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(40)
  if (!data?.length) return []
  const ids = [...new Set(data.map((r) => r.user_id))]
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, full_name, username, email')
    .in('id', ids)
  const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
  return data.map((r) => ({ ...r, profile: map[r.user_id] }))
}

export async function approveOrder(orderId: string, adminId: string, adminEmail?: string | null) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Admin only' }
  const { data: ord } = await supabase.from('payment_orders').select('*').eq('id', orderId).maybeSingle()
  if (!ord || ord.status !== 'pending') return { ok: false as const, error: 'Not pending' }
  const product = ord.product as ProductId
  if (!PRODUCTS[product]) return { ok: false as const, error: 'Bad product' }
  const act = await activateMembership(ord.user_id, product, ord.amount_inr, {
    coupon: ord.coupon_code || undefined,
    payment_ref: ord.upi_ref || undefined,
  })
  if (!act.ok) return act
  await supabase.from('payment_orders').update({
    status: 'approved',
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  }).eq('id', orderId)
  return { ok: true as const, error: null }
}

export async function rejectOrder(orderId: string, adminId: string, adminEmail?: string | null) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Admin only' }
  await supabase.from('payment_orders').update({
    status: 'rejected',
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  }).eq('id', orderId)
  return { ok: true as const, error: null }
}

export async function createCoupon(
  adminEmail: string | null | undefined,
  fields: { code: string; product: string; discount_pct: number; max_uses: number; note?: string }
) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Admin only' }
  const code = fields.code.trim().toUpperCase().replace(/\s/g, '')
  if (code.length < 3) return { ok: false as const, error: 'Code too short' }
  const { error } = await supabase.from('coupons').upsert({
    code,
    product: fields.product,
    discount_pct: Math.max(0, Math.min(100, fields.discount_pct)),
    max_uses: Math.max(1, fields.max_uses),
    active: true,
    note: fields.note || null,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function listCoupons() {
  const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(50)
  return data || []
}

export async function toggleCoupon(code: string, active: boolean, adminEmail?: string | null) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Admin only' }
  await supabase.from('coupons').update({ active }).eq('code', code)
  return { ok: true as const, error: null }
}
