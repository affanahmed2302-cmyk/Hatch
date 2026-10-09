import { supabase, isSuperAdmin } from './supabase'

export type FeatureKey =
  | 'feature_sparks'
  | 'dating_app_active'
  | 'feature_confessions'
  | 'feature_club_portal'
  | 'feature_bounties'
  | 'feature_lounge'
  | 'feature_premium'
  | 'feature_ecosystem'
  | 'feature_club_events'
  | 'maintenance_mode'

/** Defaults when app_settings row missing */
const DEFAULTS: Record<FeatureKey, boolean> = {
  feature_sparks: true,
  dating_app_active: true,
  feature_confessions: true,
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
  } catch {
    /* missing table → defaults */
  }
  // Keep sparks + dating_app_active in sync (single product switch)
  const sparksOn = !!(out.feature_sparks && out.dating_app_active)
  out.feature_sparks = sparksOn
  out.dating_app_active = sparksOn
  return out
}

export async function isFeatureOn(key: FeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags()
  if (key === 'feature_sparks' || key === 'dating_app_active') {
    return !!(flags.feature_sparks && flags.dating_app_active)
  }
  return !!flags[key]
}

export async function isDatingAppActive(): Promise<boolean> {
  return isFeatureOn('feature_sparks')
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
      const { error } = await supabase.from('app_settings').upsert(
        {
          key: k,
          value: enabled ? 'true' : 'false',
          updated_at: new Date().toISOString(),
          updated_by: adminId || null,
        },
        { onConflict: 'key' }
      )
      if (error) return { ok: false as const, error: error.message }
    }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

/** Confession window: local hours 0-23, inclusive start, exclusive end (supports overnight e.g. 0–3) */
export async function getConfessionWindow(): Promise<{ start: number; end: number }> {
  let start = 0
  let end = 3
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['confession_window_start', 'confession_window_end'])
    for (const row of data || []) {
      const n = parseInt(String(row.value), 10)
      if (Number.isNaN(n) || n < 0 || n > 23) continue
      if (row.key === 'confession_window_start') start = n
      if (row.key === 'confession_window_end') end = n
    }
  } catch {
    /* defaults */
  }
  return { start, end }
}

export async function setConfessionWindow(
  start: number,
  end: number,
  adminEmail?: string | null,
  adminId?: string | null
) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Super-admin only' }
  const s = Math.min(23, Math.max(0, Math.floor(start)))
  const e = Math.min(23, Math.max(0, Math.floor(end)))
  try {
    for (const [key, value] of [
      ['confession_window_start', String(s)],
      ['confession_window_end', String(e)],
    ] as const) {
      const { error } = await supabase.from('app_settings').upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
          updated_by: adminId || null,
        },
        { onConflict: 'key' }
      )
      if (error) return { ok: false as const, error: error.message }
    }
    return { ok: true as const, error: null }
  } catch (err: any) {
    return { ok: false as const, error: err?.message || 'Failed' }
  }
}

/** True if confessions feature is on AND current local hour is inside the window */
export async function isConfessionOpenNow(): Promise<boolean> {
  if (!(await isFeatureOn('feature_confessions'))) return false
  const { start, end } = await getConfessionWindow()
  const h = new Date().getHours()
  if (start === end) return true // 24h when equal
  if (start < end) return h >= start && h < end
  // overnight e.g. 22 → 3
  return h >= start || h < end
}

export async function fetchAdminReports(limit = 40) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('id, reporter_id, reported_id, reason, details, created_at, status')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    const ids = [...new Set(data.flatMap((r) => [r.reporter_id, r.reported_id]))]
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, email')
      .in('id', ids)
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    return data.map((r) => ({
      ...r,
      reporter: map[r.reporter_id],
      reported: map[r.reported_id],
    }))
  } catch {
    return []
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
      supabase
        .from('premium_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
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
  if (m.flags.feature_sparks) {
    if (m.sparksProfiles < 10) tips.push('Sparks is ON but few profiles — push /sparks/me consent flow.')
  } else {
    tips.push('Sparks is OFF — students will not see dating entry points.')
  }
  if (!m.flags.feature_confessions) tips.push('Confessions are OFF.')
  if (!m.flags.feature_club_portal) tips.push('Club portal is OFF — club leads cannot post events.')
  if (m.clubEvents === 0) tips.push('No club events yet — onboard 2 club admins via Pilot.')
  if (!tips.length) tips.push('Metrics healthy — double down on weekly campus drops.')
  return tips
}
