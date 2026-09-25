import { supabase } from './supabase'

export type LiveIntent = {
  id: string
  user_id: string
  campus_id: string
  location_tag: string
  message: string
  expires_at: string
  created_at: string
  profile?: { full_name?: string; username?: string } | null
}

export async function broadcastIntent(
  userId: string,
  message: string,
  locationTag = 'Campus',
) {
  try {
    const text = message.trim().slice(0, 100)
    if (!text) return { ok: false as const, error: 'Message required' }
    await supabase.from('live_intents').delete().eq('user_id', userId)
    const { data, error } = await supabase
      .from('live_intents')
      .insert({
        user_id: userId,
        campus_id: 'BMSCE',
        location_tag: locationTag.slice(0, 40) || 'Campus',
        message: text,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single()
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, data, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function fetchActiveIntents() {
  try {
    const { data, error } = await supabase
      .from('live_intents')
      .select('id, user_id, campus_id, location_tag, message, expires_at, created_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return { ok: false as const, data: [] as LiveIntent[], error: error.message }
    const rows = data || []
    const ids = [...new Set(rows.map((r) => r.user_id))]
    let map: Record<string, any> = {}
    if (ids.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', ids)
      ;(profiles || []).forEach((p: any) => { map[p.id] = p })
    }
    const enriched: LiveIntent[] = rows.map((r) => ({
      ...r,
      profile: map[r.user_id] || null,
    }))
    return { ok: true as const, data: enriched, error: null }
  } catch (e: any) {
    return { ok: false as const, data: [] as LiveIntent[], error: e?.message || 'Load failed' }
  }
}

export async function clearMyIntent(userId: string) {
  try {
    await supabase.from('live_intents').delete().eq('user_id', userId)
    return { ok: true as const }
  } catch {
    return { ok: false as const }
  }
}
