import { supabase } from './supabase'

export async function saveSparksProfile(
  userId: string,
  fields: { headline?: string; vibe?: string; looking_for?: string; prompts?: string; consent?: boolean }
) {
  const payload: any = {
    user_id: userId,
    headline: (fields.headline || '').trim() || null,
    vibe: (fields.vibe || '').trim() || null,
    looking_for: (fields.looking_for || '').trim() || null,
    prompts: (fields.prompts || '').trim() || null,
    is_visible: true,
    updated_at: new Date().toISOString(),
  }
  if (fields.consent) payload.consent_at = new Date().toISOString()
  const { error } = await supabase.from('sparks_profiles').upsert(payload)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function fetchSparksDeck(myId: string, limit = 30) {
  try {
    const { data: acted } = await supabase
      .from('sparks_likes')
      .select('to_id')
      .eq('from_id', myId)
    const skip = new Set((acted || []).map((r) => r.to_id))
    skip.add(myId)

    const { data: rows } = await supabase
      .from('sparks_profiles')
      .select('user_id, headline, vibe, looking_for, prompts')
      .eq('is_visible', true)
      .limit(80)

    const candidates = (rows || []).filter((r) => !skip.has(r.user_id)).slice(0, limit)
    if (!candidates.length) return []

    const ids = candidates.map((c) => c.user_id)
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, department, year, bio')
      .in('id', ids)
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    return candidates
      .map((c) => ({ ...c, profile: map[c.user_id] }))
      .filter((c) => c.profile)
  } catch {
    return []
  }
}

export async function sparkSwipe(fromId: string, toId: string, liked: boolean) {
  try {
    const { error } = await supabase.from('sparks_likes').upsert(
      { from_id: fromId, to_id: toId, liked },
      { onConflict: 'from_id,to_id' }
    )
    if (error) return { ok: false as const, error: error.message, matched: false }

    let matched = false
    if (liked) {
      const { data: back } = await supabase
        .from('sparks_likes')
        .select('id')
        .eq('from_id', toId)
        .eq('to_id', fromId)
        .eq('liked', true)
        .maybeSingle()
      matched = !!back
    }
    return { ok: true as const, error: null, matched }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed', matched: false }
  }
}

export async function fetchMatches(myId: string) {
  try {
    const { data: iLiked } = await supabase
      .from('sparks_likes')
      .select('to_id')
      .eq('from_id', myId)
      .eq('liked', true)
    const ids = (iLiked || []).map((r) => r.to_id)
    if (!ids.length) return []

    const { data: theyLiked } = await supabase
      .from('sparks_likes')
      .select('from_id')
      .eq('to_id', myId)
      .eq('liked', true)
      .in('from_id', ids)

    const matchIds = (theyLiked || []).map((r) => r.from_id)
    if (!matchIds.length) return []

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, department, year')
      .in('id', matchIds)
    const { data: sparks } = await supabase
      .from('sparks_profiles')
      .select('user_id, headline, vibe')
      .in('user_id', matchIds)
    const sMap = Object.fromEntries((sparks || []).map((s: any) => [s.user_id, s]))
    return (profs || []).map((p: any) => ({ profile: p, spark: sMap[p.id] }))
  } catch {
    return []
  }
}

export async function fetchLikesYou(myId: string) {
  try {
    const { data: rows } = await supabase
      .from('sparks_likes')
      .select('from_id')
      .eq('to_id', myId)
      .eq('liked', true)
    const ids = (rows || []).map((r) => r.from_id)
    if (!ids.length) return []

    // hide already matched or already acted from my side as like
    const { data: iActed } = await supabase
      .from('sparks_likes')
      .select('to_id, liked')
      .eq('from_id', myId)
      .in('to_id', ids)
    const actedMap = Object.fromEntries((iActed || []).map((r: any) => [r.to_id, r.liked]))

    const pending = ids.filter((id) => actedMap[id] === undefined)
    if (!pending.length) return []

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, department')
      .in('id', pending)
    return profs || []
  } catch {
    return []
  }
}
