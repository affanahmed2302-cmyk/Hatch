import { supabase } from './supabase'

export function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {}
}

export function playPing() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.value = 0.08
    o.start()
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    o.stop(ctx.currentTime + 0.15)
  } catch {}
}

export async function bumpChatStreak(userA: string, userB: string) {
  try {
    const [a, b] = userA < userB ? [userA, userB] : [userB, userA]
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { data: row } = await supabase.from('chat_streaks').select('*').eq('user_a', a).eq('user_b', b).maybeSingle()
    if (!row) {
      await supabase.from('chat_streaks').insert({ user_a: a, user_b: b, streak_count: 1, last_message_date: today })
      return 1
    }
    if (row.last_message_date === today) return row.streak_count
    const last = new Date(row.last_message_date)
    const t = new Date(today)
    const diff = Math.round((t.getTime() - last.getTime()) / 86400000)
    const next = diff === 1 ? (row.streak_count || 0) + 1 : 1
    await supabase.from('chat_streaks').update({ streak_count: next, last_message_date: today }).eq('id', row.id)
    return next
  } catch { return 0 }
}

export async function getChatStreak(userA: string, userB: string) {
  try {
    const [a, b] = userA < userB ? [userA, userB] : [userB, userA]
    const { data } = await supabase.from('chat_streaks').select('streak_count').eq('user_a', a).eq('user_b', b).maybeSingle()
    return data?.streak_count || 0
  } catch { return 0 }
}

export async function markMessagesRead(myId: string, peerId: string) {
  try {
    await supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('sender_id', peerId).eq('receiver_id', myId).is('read_at', null)
  } catch {}
}

export async function recordProfileView(viewerId: string, viewedId: string) {
  if (viewerId === viewedId) return
  try {
    await supabase.from('profile_views').insert({ viewer_id: viewerId, viewed_id: viewedId })
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { data } = await supabase.from('daily_activity').select('id, views_received').eq('user_id', viewedId).eq('activity_date', today).maybeSingle()
    if (data) await supabase.from('daily_activity').update({ views_received: (data.views_received || 0) + 1 }).eq('id', data.id)
    else await supabase.from('daily_activity').insert({ user_id: viewedId, activity_date: today, views_received: 1 })
  } catch {}
}

export async function fetchRecentViews(userId: string) {
  try {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    const { data } = await supabase.from('profile_views').select('viewer_id, created_at').eq('viewed_id', userId).gte('created_at', since).order('created_at', { ascending: false }).limit(20)
    if (!data?.length) return []
    const ids = [...new Set(data.map(d => d.viewer_id))]
    const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', ids)
    const map = Object.fromEntries((profs || []).map(p => [p.id, p]))
    return data.map(d => ({ ...d, profile: map[d.viewer_id] }))
  } catch { return [] }
}

export async function toggleSave(userId: string, savedId: string) {
  try {
    const { data } = await supabase.from('saved_profiles').select('id').eq('user_id', userId).eq('saved_id', savedId).maybeSingle()
    if (data) { await supabase.from('saved_profiles').delete().eq('id', data.id); return false }
    await supabase.from('saved_profiles').insert({ user_id: userId, saved_id: savedId })
    return true
  } catch { return false }
}

export async function isSaved(userId: string, savedId: string) {
  try {
    const { data } = await supabase.from('saved_profiles').select('id').eq('user_id', userId).eq('saved_id', savedId).maybeSingle()
    return !!data
  } catch { return false }
}

export async function listSaved(userId: string) {
  try {
    const { data } = await supabase.from('saved_profiles').select('saved_id, created_at').eq('user_id', userId).order('created_at', { ascending: false })
    if (!data?.length) return []
    const ids = data.map(d => d.saved_id)
    const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url, bio, department').in('id', ids)
    return profs || []
  } catch { return [] }
}

export async function mutualCount(myId: string, peerId: string) {
  try {
    const { data: mine } = await supabase.from('connections').select('user_id, target_id').eq('status', 'accepted').or(`user_id.eq.${myId},target_id.eq.${myId}`)
    const { data: theirs } = await supabase.from('connections').select('user_id, target_id').eq('status', 'accepted').or(`user_id.eq.${peerId},target_id.eq.${peerId}`)
    const setMine = new Set((mine || []).map(c => c.user_id === myId ? c.target_id : c.user_id))
    const setTheirs = new Set((theirs || []).map(c => c.user_id === peerId ? c.target_id : c.user_id))
    let n = 0
    setMine.forEach(id => { if (setTheirs.has(id) && id !== peerId && id !== myId) n++ })
    return n
  } catch { return 0 }
}

export async function postBubble(userId: string, text: string, zone = 'Campus') {
  try {
    const t = text.trim().slice(0, 80)
    if (!t) return { ok: false as const, error: 'Empty' }
    await supabase.from('status_bubbles').delete().eq('user_id', userId)
    const { data, error } = await supabase.from('status_bubbles').insert({
      user_id: userId, text: t, zone,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    }).select('*').single()
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, data }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function fetchBubbles() {
  try {
    const { data } = await supabase.from('status_bubbles').select('id, user_id, text, zone, expires_at, created_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(30)
    if (!data?.length) return []
    const ids = data.map(d => d.user_id)
    const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', ids)
    const map = Object.fromEntries((profs || []).map(p => [p.id, p]))
    return data.map(d => ({ ...d, profile: map[d.user_id] }))
  } catch { return [] }
}

export async function setFreeNow(userId: string, place: string, note?: string) {
  try {
    await supabase.from('free_now').delete().eq('user_id', userId)
    const { data, error } = await supabase.from('free_now').insert({
      user_id: userId, place, note: note || null,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }).select('*').single()
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, data }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function fetchFreeNow() {
  try {
    const { data } = await supabase.from('free_now').select('*').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(20)
    if (!data?.length) return []
    const ids = data.map(d => d.user_id)
    const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', ids)
    const map = Object.fromEntries((profs || []).map(p => [p.id, p]))
    return data.map(d => ({ ...d, profile: map[d.user_id] }))
  } catch { return [] }
}

export async function fetchLeaderboard(limit = 20) {
  try {
    const { data } = await supabase.from('profiles').select('id, full_name, username, avatar_url, rep_score, department').order('rep_score', { ascending: false }).limit(limit)
    return data || []
  } catch { return [] }
}

export async function fetchDailyRecap(userId: string) {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { data } = await supabase.from('daily_activity').select('*').eq('user_id', userId).eq('activity_date', today).maybeSingle()
    const views = await fetchRecentViews(userId)
    return { connects: data?.connects || 0, messages: data?.messages || 0, views_received: data?.views_received || views.length, recent_viewers: views.slice(0, 5) }
  } catch {
    return { connects: 0, messages: 0, views_received: 0, recent_viewers: [] as any[] }
  }
}

export async function bumpDaily(userId: string, field: 'connects' | 'messages') {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { data } = await supabase.from('daily_activity').select('*').eq('user_id', userId).eq('activity_date', today).maybeSingle()
    if (data) await supabase.from('daily_activity').update({ [field]: (data[field] || 0) + 1 }).eq('id', data.id)
    else await supabase.from('daily_activity').insert({ user_id: userId, activity_date: today, [field]: 1 })
  } catch {}
}
