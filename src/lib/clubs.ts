import { supabase, isSuperAdmin } from './supabase'

export async function createClub(
  email: string | null | undefined,
  creatorId: string,
  fields: { name: string; category: string; description?: string; adminUsername?: string }
) {
  if (!isSuperAdmin(email)) return { ok: false as const, error: 'Only super-admin can create clubs' }
  let adminId: string | null = null
  const uname = (fields.adminUsername || '').trim().replace(/^@/, '').toLowerCase()
  if (uname) {
    const { data: p } = await supabase.from('profiles').select('id').eq('username', uname).maybeSingle()
    if (!p) return { ok: false as const, error: `@${uname} not found — user needs a username` }
    adminId = p.id
  }
  const { data: club, error } = await supabase.from('clubs').insert({
    name: fields.name.trim(),
    category: fields.category || 'Other',
    description: fields.description || null,
    created_by: creatorId,
    club_admin_id: null,
  }).select('*').single()
  if (error) return { ok: false as const, error: error.message }
  if (adminId && club) {
    await supabase.from('club_admin_invites').insert({
      club_id: club.id, invitee_id: adminId, inviter_id: creatorId, status: 'pending',
    })
  }
  if (club) {
    await supabase.from('club_members').upsert({ club_id: club.id, user_id: creatorId }, { onConflict: 'club_id,user_id' })
  }
  return { ok: true as const, club, error: null }
}

export async function updateClub(
  email: string | null | undefined,
  clubId: string,
  fields: { name?: string; category?: string; description?: string }
) {
  if (!isSuperAdmin(email)) return { ok: false as const, error: 'Only super-admin can edit clubs' }
  const { error } = await supabase.from('clubs').update({
    name: fields.name?.trim(),
    category: fields.category,
    description: fields.description ?? null,
  }).eq('id', clubId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function deleteClub(email: string | null | undefined, clubId: string) {
  if (!isSuperAdmin(email)) return { ok: false as const, error: 'Only super-admin can delete clubs' }
  await supabase.from('club_posts').delete().eq('club_id', clubId)
  await supabase.from('club_admin_invites').delete().eq('club_id', clubId)
  await supabase.from('club_members').delete().eq('club_id', clubId)
  const { error } = await supabase.from('clubs').delete().eq('id', clubId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function acceptClubAdminInvite(inviteId: string, userId: string, clubId: string) {
  await supabase.from('club_admin_invites').update({ status: 'accepted' }).eq('id', inviteId)
  await supabase.from('clubs').update({ club_admin_id: userId }).eq('id', clubId)
  await supabase.from('club_members').upsert({ club_id: clubId, user_id: userId }, { onConflict: 'club_id,user_id' })
  return { ok: true as const, error: null }
}

export async function rejectClubAdminInvite(inviteId: string) {
  await supabase.from('club_admin_invites').update({ status: 'rejected' }).eq('id', inviteId)
  return { ok: true as const }
}

export async function joinClub(clubId: string, userId: string) {
  const { error } = await supabase.from('club_members').upsert(
    { club_id: clubId, user_id: userId },
    { onConflict: 'club_id,user_id' }
  )
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function leaveClub(clubId: string, userId: string) {
  const { error } = await supabase.from('club_members').delete().eq('club_id', clubId).eq('user_id', userId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function getMemberCounts(clubIds: string[]) {
  if (!clubIds.length) return {} as Record<string, number>
  const { data } = await supabase.from('club_members').select('club_id').in('club_id', clubIds)
  const map: Record<string, number> = {}
  ;(data || []).forEach((r: any) => {
    map[r.club_id] = (map[r.club_id] || 0) + 1
  })
  return map
}

export async function isMember(clubId: string, userId: string) {
  const { data } = await supabase.from('club_members').select('id').eq('club_id', clubId).eq('user_id', userId).maybeSingle()
  return !!data
}

export async function createPost(clubId: string, authorId: string, title: string, body: string) {
  const { data, error } = await supabase.from('club_posts').insert({
    club_id: clubId, author_id: authorId, title: title.trim(), body: body.trim(),
  }).select('*').single()
  if (error) return { ok: false as const, error: error.message, data: null }
  return { ok: true as const, error: null, data }
}

export async function updatePost(postId: string, title: string, body: string) {
  const { error } = await supabase.from('club_posts').update({
    title: title.trim(), body: body.trim(),
  }).eq('id', postId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from('club_posts').delete().eq('id', postId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}
