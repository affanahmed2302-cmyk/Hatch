import { supabase, isSuperAdmin } from './supabase'

export type FeatureKey =
  | 'feature_sparks'
  | 'feature_bounties'
  | 'feature_lounge'
  | 'feature_premium'
  | 'feature_ecosystem'
  | 'feature_club_events'
  | 'maintenance_mode'

const DEFAULTS: Record<FeatureKey, boolean> = {
  feature_sparks: false,
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
  } catch { /* table missing → defaults */ }
  return out
}

export async function isFeatureOn(key: FeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags()
  return !!flags[key]
}

export async function setFeatureFlag(
  key: FeatureKey,
  enabled: boolean,
  adminEmail?: string | null,
  adminId?: string | null
) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Super-admin only' }
  try {
    const { error } = await supabase.from('app_settings').upsert({
      key,
      value: enabled ? 'true' : 'false',
      updated_at: new Date().toISOString(),
      updated_by: adminId || null,
    })
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function fetchAdminMetrics() {
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const since5 = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  try {
    const [
      profiles,
      online,
      premiumPending,
      pods,
      events,
      sparks,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen', since5),
      supabase.from('premium_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('college_pod').limit(800),
      supabase.from('club_events').select('id', { count: 'exact', head: true }).gte('created_at', since24),
      supabase.from('sparks_profiles').select('user_id', { count: 'exact', head: true }),
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
      pods: [] as { pod: string; n: number }[],
    }
  }
}

/** Rule-based Assistant CEO — no external LLM required */
export function assistantCeoAdvice(m: {
  totalUsers: number
  onlineNow: number
  premiumPending: number
  events24h: number
  sparksProfiles: number
  pods: { pod: string; n: number }[]
  flags: Record<string, boolean>
}): string[] {
  const tips: string[] = []
  if (m.totalUsers < 50) {
    tips.push('Growth: under 50 users — push WhatsApp class groups + QR at canteen this week.')
  } else if (m.totalUsers < 500) {
    tips.push('Growth: solid base — run inter-dept rivalry on leaderboard to drive daily opens.')
  } else {
    tips.push('Scale: 500+ users — watch Supabase realtime limits and add read replicas later.')
  }
  if (m.onlineNow === 0 && m.totalUsers > 0) {
    tips.push('Engagement: 0 online now — schedule a Lounge prompt or Free-now push in peak hours (noon / 9pm).')
  }
  if (m.premiumPending > 0) {
    tips.push(`Revenue: ${m.premiumPending} premium UTR(s) waiting — clear Admin → Premium within 24h.`)}
  if (m.events24h === 0) {
    tips.push('Clubs: no events in 24h — onboard 2 club cores via /club-admin to fill Home feed.')
  }
  if (m.flags.feature_sparks && m.sparksProfiles < 10) {
    tips.push('Sparks is ON but thin — keep off public marketing; invite only verified premium/consent users.')
  }
  if (!m.flags.feature_sparks) {
    tips.push('Sparks kill-switch is OFF — main Hatch stays professional networking only.')
  }
  if (m.flags.maintenance_mode) {
    tips.push('ALERT: maintenance_mode is ON — turn off when deploy is stable.')
  }
  if (m.pods.length <= 1) {
    tips.push('Pods: mostly one college — referral links to peer campuses unlock national rivalry board.')
  }
  tips.push('Roadmap: Notes/Living/Market stay external (hub-spoke) so core DM/Lounge stay fast.')
  return tips
}
