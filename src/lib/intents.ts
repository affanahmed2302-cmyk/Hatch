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

    const { data: prof } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
    if (!prof) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('profiles').upsert({
        id: userId,
        email: user?.email || null,
        college: 'BMS',
        terms_accepted: true,
        rep_score: 0,
      }, { onConflict: 'id' })
    }

    await supabase.from('live_intents').delete().eq('user_id', userId)

    const { data, error } = await supabase
      .from('live_intents')
      .insert({
        user_id: userId,
        campus_id: 'BMSCE',
        location_tag: (locationTag || 'Campus').slice(0, 40),
        message: text,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      const hint =
        error.message.includes('relation') || error.code === '42P01'
          ? ' — run supabase_hatch_migration.sql in Supabase'
          : error.message.includes('row-level security') || error.code === '42501'
          ? ' — RLS blocked insert; re-run migration policies'
          : error.message
      return { ok: false as const, error: hint }
    }
    return { ok: true as const, data, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed to go live' }
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

    if (error) {
      return {
        ok: false as const,
        data: [] as LiveIntent[],
        error:
          error.code === '42P01'
            ? 'live_intents table missing — run SQL migration'
            : error.message,
      }
    }

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

    return {
      ok: true as const,
      data: rows.map((r) => ({ ...r, profile: map[r.user_id] || null })) as LiveIntent[],
      error: null,
    }
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
