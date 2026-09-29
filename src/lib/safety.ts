import { supabase } from './supabase'

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) return { ok: false as const, error: 'Cannot block yourself' }
  const { error } = await supabase.from('blocks').upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function getBlockedIds(userId: string) {
  const { data } = await supabase.from('blocks').select('blocked_id, blocker_id').or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
  const ids = new Set<string>()
  for (const r of data || []) {
    if (r.blocker_id === userId) ids.add(r.blocked_id)
    else ids.add(r.blocker_id)
  }
  return ids
}

export async function isBlocked(a: string, b: string) {
  const { data } = await supabase.from('blocks').select('id').or(
    `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`
  ).maybeSingle()
  return !!data
}

export async function reportUser(reporterId: string, reportedId: string, reason: string, details?: string) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId, reported_id: reportedId, reason, details: details || null,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function toggleCloseFriend(userId: string, friendId: string) {
  const { data } = await supabase.from('close_friends').select('id').eq('user_id', userId).eq('friend_id', friendId).maybeSingle()
  if (data) {
    await supabase.from('close_friends').delete().eq('id', data.id)
    return false
  }
  await supabase.from('close_friends').insert({ user_id: userId, friend_id: friendId })
  return true
}

export async function reactToMessage(messageId: string, userId: string, emoji: string) {
  const { data } = await supabase.from('message_reactions').select('id, emoji').eq('message_id', messageId).eq('user_id', userId).maybeSingle()
  if (data?.emoji === emoji) {
    await supabase.from('message_reactions').delete().eq('id', data.id)
    return null
  }
  await supabase.from('message_reactions').upsert({ message_id: messageId, user_id: userId, emoji }, { onConflict: 'message_id,user_id' })
  return emoji
}

export async function fetchReactions(messageIds: string[]) {
  if (!messageIds.length) return {} as Record<string, { emoji: string; count: number }[]>
  const { data } = await supabase.from('message_reactions').select('message_id, emoji').in('message_id', messageIds)
  const map: Record<string, Record<string, number>> = {}
  for (const r of data || []) {
    if (!map[r.message_id]) map[r.message_id] = {}
    map[r.message_id][r.emoji] = (map[r.message_id][r.emoji] || 0) + 1
  }
  const out: Record<string, { emoji: string; count: number }[]> = {}
  for (const [mid, em] of Object.entries(map)) {
    out[mid] = Object.entries(em).map(([emoji, count]) => ({ emoji, count }))
  }
  return out
}

export async function likePulse(pulseId: string, userId: string) {
  const { data } = await supabase.from('pulse_likes').select('id').eq('pulse_id', pulseId).eq('user_id', userId).maybeSingle()
  if (data) {
    await supabase.from('pulse_likes').delete().eq('id', data.id)
    const { data: p } = await supabase.from('pulse_posts').select('likes').eq('id', pulseId).maybeSingle()
    const next = Math.max(0, (p?.likes || 1) - 1)
    await supabase.from('pulse_posts').update({ likes: next }).eq('id', pulseId)
    return { liked: false, likes: next }
  }
  await supabase.from('pulse_likes').insert({ pulse_id: pulseId, user_id: userId })
  const { data: p } = await supabase.from('pulse_posts').select('likes, author_id').eq('id', pulseId).maybeSingle()
  const next = (p?.likes || 0) + 1
  await supabase.from('pulse_posts').update({ likes: next }).eq('id', pulseId)
  if (p?.author_id) try { await supabase.rpc('bump_rep', { p_user: p.author_id, p_amount: 1 }) } catch {}
  return { liked: true, likes: next }
}

export async function trackEvent(userId: string | null, eventName: string, props: Record<string, unknown> = {}) {
  try {
    await supabase.from('analytics_events').insert({ user_id: userId, event_name: eventName, props })
  } catch {}
}

export async function fetchCampusEvents() {
  try {
    const { data } = await supabase.from('campus_events')
      .select('*').gte('starts_at', new Date(Date.now() - 86400000).toISOString())
      .order('starts_at', { ascending: true }).limit(10)
    return data || []
  } catch { return [] }
}

export function inviteUrl(code: string) {
  if (typeof window !== 'undefined') return `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`
  return `https://hatch-primeora.vercel.app/signup?ref=${code}`
}

export async function ensureInviteCode(userId: string) {
  const { data } = await supabase.from('profiles').select('invite_code, username').eq('id', userId).maybeSingle()
  if (data?.invite_code) return data.invite_code
  const code = (data?.username || userId.slice(0, 8)) + Math.random().toString(36).slice(2, 6)
  await supabase.from('profiles').update({ invite_code: code }).eq('id', userId)
  return code
}
