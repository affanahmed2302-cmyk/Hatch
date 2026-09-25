import { supabase } from './supabase'

export async function createTeam(ownerId: string, name: string, description?: string) {
  try {
    const { data, error } = await supabase.from('teams').insert({
      name: name.trim(),
      description: description || null,
      owner_id: ownerId,
      leader_id: ownerId,
      status: 'open',
      members_needed: 4,
    }).select('*').single()
    if (error) return { ok: false as const, error: error.message }
    await supabase.from('team_members').insert({ team_id: data.id, user_id: ownerId, role: 'admin' })
    return { ok: true as const, team: data, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Create failed' }
  }
}

export async function requestJoinTeam(teamId: string, userId: string) {
  try {
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
    if ((count || 0) >= 4) return { ok: false as const, error: 'Team is full (max 4)' }
    const { error } = await supabase.from('team_requests').insert({
      team_id: teamId, user_id: userId, status: 'pending',
    })
    if (error) {
      if (error.code === '23505') return { ok: false as const, error: 'Already requested' }
      return { ok: false as const, error: error.message }
    }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Request failed' }
  }
}

export async function acceptRequest(requestId: string, adminId: string) {
  try {
    const { data, error } = await supabase.rpc('accept_team_request', {
      p_request_id: requestId,
      p_admin_id: adminId,
    })
    if (error) return { ok: false as const, error: error.message }
    if (data && data.ok === false) return { ok: false as const, error: data.error || 'Failed' }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Accept failed' }
  }
}

export async function rejectRequest(requestId: string) {
  try {
    const { error } = await supabase.from('team_requests').update({ status: 'rejected' }).eq('id', requestId)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Reject failed' }
  }
}

export async function kickMember(teamId: string, userId: string, adminId: string) {
  try {
    const { data: admin } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', adminId)
      .maybeSingle()
    const { data: team } = await supabase.from('teams').select('owner_id').eq('id', teamId).maybeSingle()
    if (admin?.role !== 'admin' && team?.owner_id !== adminId) {
      return { ok: false as const, error: 'Not admin' }
    }
    if (userId === adminId) return { ok: false as const, error: 'Cannot kick yourself' }
    const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Kick failed' }
  }
}

export async function getTeamMemberCount(teamId: string) {
  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
  return count || 0
}

export async function listPendingRequests(teamId: string) {
  const { data } = await supabase
    .from('team_requests')
    .select('id, user_id, status, created_at, profiles:user_id(full_name, username)')
    .eq('team_id', teamId)
    .eq('status', 'pending')
  return data || []
}
