import { supabase, isSuperAdmin } from './supabase'

export async function createClub(
  adminEmail: string | null | undefined,
  adminId: string,
  fields: { name: string; description?: string; category?: string; adminUserIds?: string[] }
) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Only super-admin can create clubs', id: null }
  const name = fields.name.trim()
  if (name.length < 2) return { ok: false as const, error: 'Name required', id: null }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
  const { data, error } = await supabase
    .from('campus_clubs')
    .insert({
      name,
      slug,
      description: fields.description?.trim() || null,
      category: fields.category || 'general',
      created_by: adminId,
    })
    .select('id')
    .single()
  if (error) return { ok: false as const, error: error.message, id: null }
  const clubId = data.id as string
  for (const uid of fields.adminUserIds || []) {
    if (!uid) continue
    await supabase.from('club_admins').upsert({ club_id: clubId, user_id: uid, role: 'admin' })
  }
  return { ok: true as const, error: null, id: clubId }
}

export async function listClubs() {
  const { data } = await supabase
    .from('campus_clubs')
    .select('*')
    .eq('is_active', true)
    .order('name')
  return data || []
}

export async function listClubAdmins(clubId: string) {
  const { data } = await supabase.from('club_admins').select('user_id, role').eq('club_id', clubId)
  if (!data?.length) return []
  const ids = data.map((d) => d.user_id)
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, email')
    .in('id', ids)
  return (profs || []).map((p: any) => ({
    ...p,
    role: data.find((d) => d.user_id === p.id)?.role,
  }))
}

export async function addClubAdmin(
  adminEmail: string | null | undefined,
  clubId: string,
  userId: string
) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Super-admin only' }
  const { error } = await supabase.from('club_admins').upsert({ club_id: clubId, user_id: userId, role: 'admin' })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function isClubAdmin(userId: string, clubId: string) {
  const { data } = await supabase
    .from('club_admins')
    .select('id')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function myAdminClubs(userId: string) {
  const { data } = await supabase.from('club_admins').select('club_id').eq('user_id', userId)
  if (!data?.length) return []
  const ids = data.map((d) => d.club_id)
  const { data: clubs } = await supabase.from('campus_clubs').select('*').in('id', ids)
  return clubs || []
}

export async function createClubPost(
  userId: string,
  clubId: string,
  fields: {
    post_type: string
    title?: string
    body?: string
    media_url?: string
    link_url?: string
    poll_options?: string[]
  },
  isSuper?: boolean
) {
  const ok = isSuper || (await isClubAdmin(userId, clubId))
  if (!ok) return { ok: false as const, error: 'Club admin only' }
  const { error } = await supabase.from('club_posts').insert({
    club_id: clubId,
    author_id: userId,
    post_type: fields.post_type || 'notice',
    title: fields.title?.trim() || null,
    body: fields.body?.trim() || null,
    media_url: fields.media_url?.trim() || null,
    link_url: fields.link_url?.trim() || null,
    poll_options: fields.poll_options?.length ? fields.poll_options : null,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function fetchClubPosts(clubId: string) {
  const { data } = await supabase
    .from('club_posts')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(40)
  return data || []
}

export async function reactToPost(userId: string, postId: string, emoji: string) {
  const { error } = await supabase.from('club_reactions').upsert(
    { post_id: postId, user_id: userId, emoji },
    { onConflict: 'post_id,user_id,emoji' }
  )
  if (error) {
    // toggle off if duplicate path fails oddly
    await supabase.from('club_reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji)
    return { ok: true as const, error: null }
  }
  return { ok: true as const, error: null }
}

export async function reactionCounts(postId: string) {
  const { data } = await supabase.from('club_reactions').select('emoji').eq('post_id', postId)
  const map: Record<string, number> = {}
  for (const r of data || []) map[r.emoji] = (map[r.emoji] || 0) + 1
  return map
}

export async function grantBadge(
  adminEmail: string | null | undefined,
  adminId: string,
  userId: string,
  badge: string,
  note?: string
) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Super-admin only' }
  const { error } = await supabase.from('user_badges').upsert({
    user_id: userId,
    badge: badge.trim(),
    note: note || null,
    granted_by: adminId,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function searchUsers(q: string) {
  const s = q.trim()
  if (s.length < 2) return []
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, avatar_url')
    .or(`username.ilike.%${s}%,full_name.ilike.%${s}%,email.ilike.%${s}%`)
    .limit(15)
  return data || []
}

export const EMOJI_SET = ['👍', '🔥', '❤️', '👏', '🎯', '💡']
