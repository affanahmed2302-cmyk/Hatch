import { supabase } from './supabase'

export async function createTeam(
  ownerId: string,
  name: string,
  description?: string,
  membersNeeded = 4,
) {
  try {
    const max = Math.min(10, Math.max(2, Number(membersNeeded) || 4))
    const { data, error } = await supabase.from('teams').insert({
      name: name.trim(),
      description: description || null,
      owner_id: ownerId,
      leader_id: ownerId,
      status: 'open',
      members_needed: max,
    }).select('*').single()
    if (error) return { ok: false as const, error: error.message }
    await supabase.from('team_members').insert({ team_id: data.id, user_id: ownerId, role: 'admin' })
    return { ok: true as const, team: data, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Create failed' }
  }
}

export async function getTeamMax(teamId: string) {
  const { data } = await supabase.from('teams').select('members_needed').eq('id', teamId).maybeSingle()
  return Math.min(10, Math.max(2, data?.members_needed || 4))
}

export async function requestJoinTeam(teamId: string, userId: string) {
  try {
    const max = await getTeamMax(teamId)
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
    if ((count || 0) >= max) return { ok: false as const, error: `Team is full (max ${max})` }
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
    const rpc = await supabase.rpc('accept_team_request', {
      p_request_id: requestId,
      p_admin_id: adminId,
    })
    if (!rpc.error && rpc.data && rpc.data.ok !== false) {
      return { ok: true as const, error: null }
    }

    const { data: req, error: re } = await supabase
      .from('team_requests')
      .select('id, team_id, user_id, status')
      .eq('id', requestId)
      .eq('status', 'pending')
      .maybeSingle()
    if (re || !req) return { ok: false as const, error: re?.message || 'Request not found' }

    const max = await getTeamMax(req.team_id)
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', req.team_id)
    if ((count || 0) >= max) return { ok: false as const, error: `Team full (max ${max})` }

    const { error: me } = await supabase.from('team_members').insert({
      team_id: req.team_id,
      user_id: req.user_id,
      role: 'member',
    })
    if (me && me.code !== '23505') return { ok: false as const, error: me.message }

    await supabase.from('team_requests').update({ status: 'accepted' }).eq('id', requestId)
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

export async function fetchTeamMessages(teamId: string) {
  try {
    const { data, error } = await supabase
      .from('team_messages')
      .select('id, team_id, sender_id, content, created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (error) return { ok: false as const, data: [], error: error.message }
    return { ok: true as const, data: data || [], error: null }
  } catch (e: any) {
    return { ok: false as const, data: [], error: e?.message || 'Load failed' }
  }
}

export async function sendTeamMessage(teamId: string, senderId: string, content: string) {
  try {
    const text = content.trim()
    if (!text) return { ok: false as const, error: 'Empty message' }
    const { data, error } = await supabase.from('team_messages').insert({
      team_id: teamId,
      sender_id: senderId,
      content: text,
    }).select('*').single()
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, data, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Send failed' }
  }
}
