import { supabase } from './supabase'

export async function isClubCore(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('club_core')
      .select('id')
      .eq('user_id', userId)
      .eq('verified', true)
      .limit(1)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export async function requestClubCore(userId: string, clubName: string) {
  const name = clubName.trim()
  if (name.length < 2) return { ok: false as const, error: 'Club name required' }
  try {
    const { error } = await supabase.from('club_core').upsert(
      { user_id: userId, club_name: name, role: 'core', verified: false },
      { onConflict: 'user_id,club_name' }
    )
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function listPendingClubCore() {
  const { data } = await supabase
    .from('club_core')
    .select('id, user_id, club_name, role, verified, created_at')
    .eq('verified', false)
    .order('created_at', { ascending: true })
    .limit(40)
  if (!data?.length) return []
  const ids = data.map((r) => r.user_id)
  const { data: profs } = await supabase.from('profiles').select('id, full_name, username, email').in('id', ids)
  const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
  return data.map((r) => ({ ...r, profile: map[r.user_id] }))
}

export async function verifyClubCore(id: string, verified: boolean) {
  const { error } = await supabase.from('club_core').update({ verified }).eq('id', id)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function publishClubEvent(
  userId: string,
  fields: {
    title: string
    body?: string
    event_at?: string
    venue?: string
    budget_inr?: number
    publish_to_feed?: boolean
    club_id?: string | null
  }
) {
  const title = fields.title.trim()
  if (title.length < 3) return { ok: false as const, error: 'Title too short' }
  try {
    const { data, error } = await supabase
      .from('club_events')
      .insert({
        created_by: userId,
        club_id: fields.club_id || null,
        title,
        body: (fields.body || '').trim() || null,
        event_at: fields.event_at || null,
        venue: fields.venue || null,
        budget_inr: fields.budget_inr || 0,
        publish_to_feed: fields.publish_to_feed !== false,
        status: 'published',
      })
      .select('*')
      .single()
    if (error) return { ok: false as const, error: error.message, data: null }
    return { ok: true as const, error: null, data }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed', data: null }
  }
}

export async function fetchFeedEvents(limit = 12) {
  try {
    const { data } = await supabase
      .from('club_events')
      .select('id, title, body, event_at, venue, created_at, created_by')
      .eq('publish_to_feed', true)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  } catch {
    return []
  }
}
