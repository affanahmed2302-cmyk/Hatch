import { supabase } from './supabase'

export async function saveSparksProfile(
  userId: string,
  fields: {
    headline?: string
    vibe?: string
    looking_for?: string
    prompts?: string
    gender?: string
    meet_pref?: string
    consent?: boolean
  }
) {
  // Do NOT write gender into sparks_profiles — column may not exist.
  // Gender is stored on profiles only.
  const payload: any = {
    user_id: userId,
    headline: (fields.headline || '').trim() || null,
    vibe: (fields.vibe || '').trim() || null,
    looking_for: (fields.looking_for || '').trim() || null,
    prompts: (fields.prompts || '').trim() || null,
    meet_pref: (fields.meet_pref || '').trim() || null,
    is_visible: true,
    updated_at: new Date().toISOString(),
  }
  if (fields.consent) payload.consent_at = new Date().toISOString()

  const { error } = await supabase.from('sparks_profiles').upsert(payload, {
    onConflict: 'user_id',
  })
  if (error) return { ok: false as const, error: error.message }

  if (fields.gender) {
    try {
      await supabase
        .from('profiles')
        .update({ gender: (fields.gender || '').trim() })
        .eq('id', userId)
    } catch {
      /* optional */
    }
  }
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
      .select('user_id, headline, vibe, looking_for, prompts, meet_pref')
      .eq('is_visible', true)
      .limit(80)

    const candidates = (rows || []).filter((r) => !skip.has(r.user_id)).slice(0, limit)
    if (!candidates.length) return []

    const ids = candidates.map((c) => c.user_id)
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, department, year, bio, gender')
      .in('id', ids)
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    return candidates
      .map((c) => ({ ...c, profile: map[c.user_id], gender: map[c.user_id]?.gender }))
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
      const { data: other } = await supabase
        .from('sparks_likes')
        .select('id')
        .eq('from_id', toId)
        .eq('to_id', fromId)
        .eq('liked', true)
        .maybeSingle()
      if (other) {
        matched = true
        const [a, b] = fromId < toId ? [fromId, toId] : [toId, fromId]
        await supabase.from('sparks_matches').upsert(
          { user_a: a, user_b: b },
          { onConflict: 'user_a,user_b' }
        )
      }
    }
    return { ok: true as const, error: null, matched }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Swipe failed', matched: false }
  }
}

export async function fetchSparksMatches(myId: string) {
  try {
    const { data } = await supabase
      .from('sparks_matches')
      .select('user_a, user_b, created_at')
      .or(`user_a.eq.${myId},user_b.eq.${myId}`)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!data?.length) return []
    const peerIds = data.map((m) => (m.user_a === myId ? m.user_b : m.user_a))
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, department, year, gender')
      .in('id', peerIds)
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    return peerIds.map((id) => map[id]).filter(Boolean)
  } catch {
    return []
  }
}

export async function fetchSparksLikes(myId: string) {
  try {
    const { data } = await supabase
      .from('sparks_likes')
      .select('from_id, created_at')
      .eq('to_id', myId)
      .eq('liked', true)
      .order('created_at', { ascending: false })
      .limit(40)
    if (!data?.length) return []
    const ids = data.map((d) => d.from_id)
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, department, gender')
      .in('id', ids)
    return profs || []
  } catch {
    return []
  }
}
