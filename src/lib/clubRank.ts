import { supabase } from './supabase'

/**
 * Automated club ranking (no manual placement):
 * score = members*3 + events*5 + recent_messages*2
 * Falls back to member count if tables missing.
 */
export async function rankClubs(clubs: { id: string; name?: string }[]) {
  if (!clubs.length) return [] as { id: string; score: number; rank: number; members: number }[]

  const ids = clubs.map((c) => c.id)
  const members: Record<string, number> = {}
  const events: Record<string, number> = {}
  const activity: Record<string, number> = {}

  try {
    const { data: mem } = await supabase
      .from('club_members')
      .select('club_id')
      .in('club_id', ids)
    for (const row of mem || []) {
      members[row.club_id] = (members[row.club_id] || 0) + 1
    }
  } catch {
    /* */
  }

  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: ev } = await supabase
      .from('club_events')
      .select('club_id')
      .in('club_id', ids)
      .gte('created_at', since)
    for (const row of ev || []) {
      if (row.club_id) events[row.club_id] = (events[row.club_id] || 0) + 1
    }
  } catch {
    /* */
  }

  try {
    const since = new Date(Date.now() - 14 * 86400000).toISOString()
    const { data: posts } = await supabase
      .from('club_posts')
      .select('club_id')
      .in('club_id', ids)
      .gte('created_at', since)
    for (const row of posts || []) {
      if (row.club_id) activity[row.club_id] = (activity[row.club_id] || 0) + 1
    }
  } catch {
    /* optional table */
  }

  const scored = ids.map((id) => {
    const m = members[id] || 0
    const e = events[id] || 0
    const a = activity[id] || 0
    const score = m * 3 + e * 5 + a * 2
    return { id, score, members: m, rank: 0 }
  })
  scored.sort((a, b) => b.score - a.score || b.members - a.members)
  scored.forEach((row, i) => {
    row.rank = i + 1
  })
  return scored
}
