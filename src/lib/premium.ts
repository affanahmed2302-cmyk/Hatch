import { supabase, isSuperAdmin } from './supabase'

export const UPI_NUMBER = '9480751817'
export const UPI_DISPLAY = '+91 9480751817'
export const PLANS = {
  '1m': { label: '1 month', amount: 120, days: 30 },
  '3m': { label: '3 months', amount: 300, days: 90 },
} as const

export type PlanId = keyof typeof PLANS

export async function getPremiumStatus(userId: string): Promise<{
  active: boolean
  until: string | null
}> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('is_premium, premium_until')
      .eq('id', userId)
      .maybeSingle()
    if (!data) return { active: false, until: null }
    const until = data.premium_until as string | null
    if (until && new Date(until).getTime() > Date.now()) {
      return { active: true, until }
    }
    if (data.is_premium && until && new Date(until).getTime() <= Date.now()) {
      await supabase.from('profiles').update({ is_premium: false }).eq('id', userId)
    }
    return { active: false, until }
  } catch {
    return { active: false, until: null }
  }
}

export async function submitPremiumRequest(
  userId: string,
  plan: PlanId,
  upiRef: string,
  note?: string
) {
  const p = PLANS[plan]
  if (!p) return { ok: false as const, error: 'Invalid plan' }
  const ref = (upiRef || '').trim()
  if (ref.length < 4) return { ok: false as const, error: 'Enter UPI / transaction reference' }
  try {
    const { data: existing } = await supabase
      .from('premium_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle()
    if (existing) return { ok: false as const, error: 'You already have a pending request — wait for approval' }

    const { error } = await supabase.from('premium_requests').insert({
      user_id: userId,
      plan,
      amount_inr: p.amount,
      upi_ref: ref,
      note: (note || '').trim() || null,
      status: 'pending',
    })
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Submit failed' }
  }
}

export async function listPendingPremium() {
  const { data, error } = await supabase
    .from('premium_requests')
    .select('id, user_id, plan, amount_inr, upi_ref, note, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) return []
  if (!data?.length) return []
  const ids = [...new Set(data.map((r) => r.user_id))]
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, avatar_url')
    .in('id', ids)
  const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
  return data.map((r) => ({ ...r, profile: map[r.user_id] }))
}

export async function approvePremium(requestId: string, adminId: string, adminEmail?: string | null) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Admin only' }
  const { data: req } = await supabase
    .from('premium_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()
  if (!req || req.status !== 'pending') return { ok: false as const, error: 'Request not pending' }
  const plan = PLANS[req.plan as PlanId]
  if (!plan) return { ok: false as const, error: 'Bad plan' }
  const until = new Date(Date.now() + plan.days * 86400000).toISOString()
  await supabase
    .from('premium_requests')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
  await supabase
    .from('profiles')
    .update({ is_premium: true, premium_until: until, updated_at: new Date().toISOString() })
    .eq('id', req.user_id)
  return { ok: true as const, error: null, until }
}

export async function rejectPremium(requestId: string, adminId: string, adminEmail?: string | null) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Admin only' }
  await supabase
    .from('premium_requests')
    .update({
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
  return { ok: true as const, error: null }
}
