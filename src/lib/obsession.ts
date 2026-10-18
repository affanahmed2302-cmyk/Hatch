import { supabase } from './supabase'
import { computeLeaderScore } from './profileRank'

export function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* */
  }
}

export function playPing() {
  try {
    const AC = typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)
    if (!AC) return
    const ctx = new AC()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    g.gain.value = 0.04
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.08)
  } catch {
    /* */
  }
}

export async function bumpChatStreak(userA: string, userB: string) {
  try {
    const [a, b] = [userA, userB].sort()
    const key = `${a}:${b}`
    const { data } = await supabase.from('chat_streaks').select('*').eq('pair_key', key).maybeSingle()
    const next = (data?.count || 0) + 1
    await supabase.from('chat_streaks').upsert({ pair_key: key, user_a: a, user_b: b, count: next, updated_at: new Date().toISOString() })
  } catch {
    /* optional table */
  }
}

export async function getChatStreak(userA: string, userB: string) {
  try {
    const [a, b] = [userA, userB].sort()
    const { data } = await supabase.from('chat_streaks').select('count').eq('pair_key', `${a}:${b}`).maybeSingle()
    return data?.count || 0
  } catch {
    return 0
  }
}

export async function markMessagesRead(myId: string, peerId: string) {
  try {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', myId)
      .eq('sender_id', peerId)
      .is('read_at', null)
  } catch {
    /* */
  }
}

export async function recordProfileView(viewerId: string, viewedId: string) {
  if (viewerId === viewedId) return
  try {
    await supabase.from('profile_views').insert({ viewer_id: viewerId, viewed_id: viewedId })
  } catch {
    /* */
  }
}

export async function fetchRecentViews(userId: string) {
  try {
    const { data } = await supabase
      .from('profile_views')
      .select('viewer_id, created_at')
      .eq('viewed_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    return data || []
  } catch {
    return []
  }
}

export async function toggleSave(userId: string, savedId: string) {
  try {
    const { data } = await supabase.from('saves').select('id').eq('user_id', userId).eq('saved_id', savedId).maybeSingle()
    if (data) {
      await supabase.from('saves').delete().eq('id', data.id)
      return false
    }
    await supabase.from('saves').insert({ user_id: userId, saved_id: savedId })
    return true
  } catch {
    return false
  }
}

export async function isSaved(userId: string, savedId: string) {
  try {
    const { data } = await supabase.from('saves').select('id').eq('user_id', userId).eq('saved_id', savedId).maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export async function listSaved(userId: string) {
  try {
    const { data } = await supabase.from('saves').select('saved_id').eq('user_id', userId)
    return (data || []).map((r) => r.saved_id)
  } catch {
    return []
  }
}

export async function mutualCount(myId: string, peerId: string) {
  try {
    const { count } = await supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .or(`and(user_id.eq.${myId},target_id.eq.${peerId}),and(user_id.eq.${peerId},target_id.eq.${myId})`)
      .eq('status', 'accepted')
    return count || 0
  } catch {
    return 0
  }
}

export async function postBubble(userId: string, text: string, zone = 'Campus') {
  try {
    const { error } = await supabase.from('bubbles').insert({ user_id: userId, text, zone })
    return { ok: !error, error: error?.message }
  } catch (e: any) {
    return { ok: false, error: e?.message }
  }
}

export async function fetchBubbles() {
  try {
    const { data } = await supabase.from('bubbles').select('*').order('created_at', { ascending: false }).limit(40)
    return data || []
  } catch {
    return []
  }
}

export async function setFreeNow(userId: string, place: string, note?: string) {
  try {
    const expires = new Date(Date.now() + 90 * 60 * 1000).toISOString()
    await supabase.from('free_now').upsert(
      { user_id: userId, place, note: note || null, expires_at: expires, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message }
  }
}

export async function fetchFreeNow() {
  try {
    const now = new Date().toISOString()
    const { data } = await supabase.from('free_now').select('*, profiles:user_id(id, full_name, username, avatar_url, department)').gt('expires_at', now).order('updated_at', { ascending: false }).limit(40)
    return data || []
  } catch {
    return []
  }
}

/** Leaderboard: activity rep + career links (GitHub / LinkedIn / LeetCode / phone) */
export async function fetchLeaderboard(limit = 25) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select(
        'id, full_name, username, avatar_url, rep_score, department, college_pod, github_url, github_handle, linkedin_url, leetcode_url, leetcode_handle, phone, skills, bio'
      )
      .limit(80)
    const ranked = (data || [])
      .map((p) => ({
        ...p,
        leader_score: computeLeaderScore(p),
        career_score: computeLeaderScore(p) - (Number(p.rep_score) || 0),
      }))
      .sort((a, b) => b.leader_score - a.leader_score)
      .slice(0, limit)
    return ranked
  } catch {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, rep_score, department')
        .order('rep_score', { ascending: false })
        .limit(limit)
      return data || []
    } catch {
      return []
    }
  }
}

export async function fetchDailyRecap(userId: string) {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { data } = await supabase.from('daily_activity').select('*').eq('user_id', userId).eq('activity_date', today).maybeSingle()
    const views = await fetchRecentViews(userId)
    return {
      connects: data?.connects || 0,
      messages: data?.messages || 0,
      views_received: data?.views_received || views.length,
      recent_viewers: views.slice(0, 5),
    }
  } catch {
    return { connects: 0, messages: 0, views_received: 0, recent_viewers: [] as any[] }
  }
}

export async function bumpDaily(userId: string, field: 'connects' | 'messages') {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { data } = await supabase.from('daily_activity').select('*').eq('user_id', userId).eq('activity_date', today).maybeSingle()
    const next = { ...(data || {}), user_id: userId, activity_date: today, [field]: ((data as any)?.[field] || 0) + 1 }
    await supabase.from('daily_activity').upsert(next)
  } catch {
    /* */
  }
}
