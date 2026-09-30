import { supabase, isSuperAdmin } from './supabase'

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

const DEFAULTS: Record<FeatureKey, boolean> = {
  feature_sparks: false,
  dating_app_active: false,
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
  // Keep sparks + dating_app_active in sync if only one is set
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

/** Dating sister app gate */
export async function isDatingAppActive(): Promise<boolean> {
  return isFeatureOn('dating_app_active')
}

/** Club portal / HQ gate */
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
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const since5 = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  try {
    const [profiles, online, premiumPending, pods, events, sparks, clubs] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen', since5),
      supabase.from('premium_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('college_pod').limit(800),
      supabase.from('club_events').select('id', { count: 'exact', head: true }).gte('created_at', since24),
      supabase.from('sparks_profiles').select('user_id', { count: 'exact', head: true }),
      supabase.from('clubs').select('id', { count: 'exact', head: true }),
    ])

    const podMap: Record<string, number> = {}
    for (const p of pods.data || []) {
      const k = p.college_pod || 'unknown'
      podMap[k] = (podMap[k] || 0) + 1
    }

    return {
      totalUsers: profiles.count || 0,
      onlineNow: online.count || 0,
      premiumPending: premiumPending.count || 0,
      events24h: events.count || 0,
      sparksProfiles: sparks.count || 0,
      clubsCount: clubs.count || 0,
      pods: Object.entries(podMap)
        .map(([pod, n]) => ({ pod, n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 12),
    }
  } catch {
    return {
      totalUsers: 0,
      onlineNow: 0,
      premiumPending: 0,
      events24h: 0,
      sparksProfiles: 0,
      clubsCount: 0,
      pods: [] as { pod: string; n: number }[],
    }
  }
}

export function assistantCeoAdvice(m: {
  totalUsers: number
  onlineNow: number
  premiumPending: number
  events24h: number
  sparksProfiles: number
  clubsCount?: number
  pods: { pod: string; n: number }[]
  flags: Record<string, boolean>
}): string[] {
  const tips: string[] = []
  if (m.totalUsers < 50) {
    tips.push('Growth: under 50 users — push WhatsApp class groups + QR at canteen this week.')
  } else if (m.totalUsers < 500) {
    tips.push('Growth: solid base — inter-dept rivalry on leaderboard drives daily opens.')
  } else {
    tips.push('Scale: 500+ users — watch Supabase realtime limits.')
  }
  if (m.onlineNow === 0 && m.totalUsers > 0) {
    tips.push('Engagement: 0 online — schedule Lounge/Free-now prompts at noon and 9pm.')
  }
  if (m.premiumPending > 0) {
    tips.push(`Revenue: ${m.premiumPending} premium UTR(s) pending — clear in Pilot within 24h.`)}
  if ((m.clubsCount || 0) < 10) {
    tips.push('Clubs: under 10 clubs — open Clubs HQ and run bulk seed for 60+ templates.')
  }
  if (m.events24h === 0) {
    tips.push('Feed: no club events in 24h — verify a club core and publish one event.')
  }
  if (m.flags.feature_sparks || m.flags.dating_app_active) {
    if (m.sparksProfiles < 10) {
      tips.push('Sparks is ON but thin — soft-invite trusted users only; keep off public posters.')
    } else {
      tips.push(`Sparks: ${m.sparksProfiles} profiles live — monitor reports in chat ⋮.`)}
  } else {
    tips.push('Sparks kill-switch OFF — core Hatch stays pure career networking.')
  }
  if (!m.flags.feature_club_portal) {
    tips.push('Club portal is OFF — organizers cannot publish until you re-enable.')
  }
  if (m.flags.maintenance_mode) {
    tips.push('ALERT: maintenance_mode ON — disable when stable.')
  }
  tips.push('Architecture: Sparks + Clubs HQ are sister portals; campus Home stays light.')
  return tips
}
