import { supabase, isSuperAdmin } from '@/lib/supabase'

export type FeatureKey =
  | 'feature_sparks'
  | 'dating_app_active'
  | 'feature_club_portal'
  | 'feature_bounties'
  | 'feature_lounge'
  | 'feature_premium'
  | 'feature_ecosystem'
  | 'feature_club_events'
  | 'maintenance_mode'

/** Defaults when app_settings row missing — sparks LIVE for all users */
const DEFAULTS: Record<FeatureKey, boolean> = {
  feature_sparks: true,
  dating_app_active: true,
  feature_club_portal: true,
  feature_bounties: true,
  feature_lounge: true,
  feature_premium: true,
  feature_ecosystem: true,
  feature_club_events: true,
  maintenance_mode: false,
}

export async function getFeatureFlags(): Promise<Record<FeatureKey, boolean>> {
  const out = { ...DEFAULTS }
  try {
    const { data } = await supabase.from('app_settings').select('key, value')
    for (const row of data || []) {
      if (row.key in out) {
        out[row.key as FeatureKey] = String(row.value).toLowerCase() === 'true'
      }
    }
  } catch { /* missing table → defaults */ }
  if (out.feature_sparks || out.dating_app_active) {
    out.feature_sparks = true
    out.dating_app_active = true
  }
  return out
}

export async function isFeatureOn(key: FeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags()
  if (key === 'feature_sparks' || key === 'dating_app_active') {
    return !!(flags.feature_sparks || flags.dating_app_active)
  }
  return !!flags[key]
}

export async function isDatingAppActive(): Promise<boolean> {
  return isFeatureOn('dating_app_active')
}

export async function isClubPortalActive(): Promise<boolean> {
  return isFeatureOn('feature_club_portal')
}

export async function setFeatureFlag(
  key: FeatureKey,
  enabled: boolean,
  adminEmail?: string | null,
  adminId?: string | null
) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Super-admin only' }
  try {
    const keys: FeatureKey[] =
      key === 'feature_sparks' || key === 'dating_app_active'
        ? ['feature_sparks', 'dating_app_active']
        : [key]

    for (const k of keys) {
      const { error } = await supabase.from('app_settings').upsert({
        key: k,
        value: enabled ? 'true' : 'false',
        updated_at: new Date().toISOString(),
        updated_by: adminId || null,
      })
      if (error) return { ok: false as const, error: error.message }
    }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function fetchAdminMetrics() {
  const empty = {
    users: 0,
    messages: 0,
    premiumPending: 0,
    clubEvents: 0,
    sparksProfiles: 0,
    flags: await getFeatureFlags(),
  }
  try {
    const [u, m, p, c, s] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('premium_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('club_events').select('id', { count: 'exact', head: true }),
      supabase.from('sparks_profiles').select('user_id', { count: 'exact', head: true }),
    ])
    return {
      users: u.count || 0,
      messages: m.count || 0,
      premiumPending: p.count || 0,
      clubEvents: c.count || 0,
      sparksProfiles: s.count || 0,
      flags: await getFeatureFlags(),
    }
  } catch {
    return empty
  }
}

export function assistantCeoAdvice(m: {
  users: number
  messages: number
  premiumPending: number
  clubEvents: number
  sparksProfiles: number
  flags: Record<string, boolean>
}): string[] {
  const tips: string[] = []
  if (m.users < 50) tips.push('Push offline invites in class groups — target 50 verified accounts this week.')
  if (m.messages < m.users * 2) tips.push('Prompt Free-now pings — chat volume is low vs users.')
  if (m.premiumPending > 5) tips.push('Clear pending premium UTRs in Pilot → Commerce.')
  if (m.flags.feature_sparks || m.flags.dating_app_active) {
    if (m.sparksProfiles < 10) tips.push('Sparks is ON but few profiles — push /sparks/me consent flow.')
  }
  if (!m.flags.feature_club_portal) tips.push('Club portal is OFF — club leads cannot post events.')
  if (m.clubEvents === 0) tips.push('No club events yet — onboard 2 club admins via Pilot.')
  if (!tips.length) tips.push('Metrics healthy — double down on weekly campus drops.')
  return tips
}
