import { supabase } from './supabase'

export type LivingType = 'hostel' | 'pg' | 'shared_flat' | 'rented_room' | 'day_hosteller' | 'other'

export type HostelProfile = {
  user_id: string
  living_type: LivingType
  campus?: string | null
  locality?: string | null
  place_name?: string | null
  budget?: string | null
  food_pref?: string | null
  share_pref?: string | null
  priorities?: string[] | null
  onboarded_at?: string | null
}

export async function fetchHostelProfile(userId: string): Promise<HostelProfile | null> {
  try {
    const { data, error } = await supabase
      .from('hostel_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return null
    return data as HostelProfile
  } catch {
    return null
  }
}

export async function saveHostelProfile(
  userId: string,
  fields: Partial<HostelProfile>
): Promise<{ ok: boolean; error?: string }> {
  const payload: any = {
    user_id: userId,
    living_type: fields.living_type || 'hostel',
    campus: fields.campus || 'BMSCE',
    locality: (fields.locality || '').trim() || null,
    place_name: (fields.place_name || '').trim() || null,
    budget: fields.budget || null,
    food_pref: fields.food_pref || null,
    share_pref: fields.share_pref || null,
    priorities: fields.priorities || [],
    onboarded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('hostel_profiles').upsert(payload, { onConflict: 'user_id' })
  if (error) {
    return {
      ok: false,
      error:
        error.message.includes('hostel_profiles') || error.code === '42P01'
          ? 'Run hatch_hostel.sql in Supabase first'
          : error.message,
    }
  }
  return { ok: true }
}

export async function createHostelRequest(
  userId: string,
  opts: {
    category: string
    body: string
    locality?: string
    budget?: string
    hours?: number
  }
) {
  const text = (opts.body || '').trim()
  if (!text || text.length > 280) return { ok: false as const, error: '1-280 characters' }
  const hours = Math.min(Math.max(opts.hours || 48, 1), 168)
  const expires = new Date(Date.now() + hours * 3600 * 1000).toISOString()
  const { data, error } = await supabase
    .from('hostel_requests')
    .insert({
      user_id: userId,
      category: opts.category || 'general',
      body: text,
      locality: opts.locality || null,
      budget: opts.budget || null,
      status: 'open',
      expires_at: expires,
    })
    .select('id')
    .single()
  if (error) {
    return {
      ok: false as const,
      error:
        error.message.includes('hostel_requests') || error.code === '42P01'
          ? 'Run hatch_hostel.sql in Supabase first'
          : error.message,
    }
  }
  return { ok: true as const, id: data?.id }
}

export async function fetchHostelRequests(limit = 40) {
  try {
    const { data, error } = await supabase
      .from('hostel_requests')
      .select('id, user_id, category, body, locality, budget, status, expires_at, created_at')
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    const ids = [...new Set(data.map((r) => r.user_id))]
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', ids)
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    return data.map((r) => ({ ...r, profile: map[r.user_id] }))
  } catch {
    return []
  }
}

export async function respondHostelRequest(requestId: string, fromId: string, message: string) {
  const text = message.trim()
  if (!text) return { ok: false as const, error: 'Write a short reply' }
  const { error } = await supabase.from('hostel_request_replies').insert({
    request_id: requestId,
    user_id: fromId,
    body: text.slice(0, 200),
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function createHostelListing(
  userId: string,
  opts: {
    title: string
    description?: string
    kind: 'sale' | 'borrow' | 'lend' | 'free'
    price?: string
    category?: string
  }
) {
  const title = (opts.title || '').trim()
  if (!title) return { ok: false as const, error: 'Title required' }
  const { data, error } = await supabase
    .from('hostel_listings')
    .insert({
      user_id: userId,
      title,
      description: (opts.description || '').trim() || null,
      kind: opts.kind,
      price: opts.price || null,
      category: opts.category || 'general',
      status: 'available',
    })
    .select('id')
    .single()
  if (error) {
    return {
      ok: false as const,
      error:
        error.message.includes('hostel_listings') || error.code === '42P01'
          ? 'Run hatch_hostel.sql in Supabase first'
          : error.message,
    }
  }
  return { ok: true as const, id: data?.id }
}

export async function fetchHostelListings(limit = 40) {
  try {
    const { data, error } = await supabase
      .from('hostel_listings')
      .select('id, user_id, title, description, kind, price, category, status, created_at')
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    const ids = [...new Set(data.map((r) => r.user_id))]
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', ids)
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    return data.map((r) => ({ ...r, profile: map[r.user_id] }))
  } catch {
    return []
  }
}

export async function fetchHostelTips(locality?: string | null) {
  try {
    const { data, error } = await supabase
      .from('hostel_tips')
      .select('id, title, body, tag, locality, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error || !data) return []
    if (locality) {
      const loc = locality.toLowerCase()
      return data.filter(
        (t) => !t.locality || String(t.locality).toLowerCase().includes(loc)
      )
    }
    return data
  } catch {
    return []
  }
}

export async function addHostelTip(
  userId: string,
  opts: { title: string; body: string; tag?: string; locality?: string }
) {
  const title = opts.title.trim()
  const body = opts.body.trim()
  if (!title || !body) return { ok: false as const, error: 'Title and tip required' }
  const { error } = await supabase.from('hostel_tips').insert({
    user_id: userId,
    title: title.slice(0, 80),
    body: body.slice(0, 400),
    tag: opts.tag || 'general',
    locality: opts.locality || null,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}
