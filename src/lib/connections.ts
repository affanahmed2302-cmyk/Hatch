/**
 * Connection requests — authoritative helpers for Discover / Hostel / Profile.
 * Schema: connections(user_id, target_id, status)
 */
import { supabase } from './supabase'

export type ConnStatus = 'pending' | 'accepted' | 'rejected'

export type ConnectionRow = {
  id: string
  user_id: string
  target_id: string
  status: ConnStatus
  created_at?: string
}

function peerOf(row: ConnectionRow, me: string) {
  return row.user_id === me ? row.target_id : row.user_id
}

export async function fetchMyConnections(myId: string): Promise<ConnectionRow[]> {
  const { data, error } = await supabase
    .from('connections')
    .select('id, user_id, target_id, status, created_at')
    .or(`user_id.eq.${myId},target_id.eq.${myId}`)
  if (error) return []
  return (data || []) as ConnectionRow[]
}

export async function partitionConnections(myId: string) {
  const rows = await fetchMyConnections(myId)
  const accepted = new Set<string>()
  const pendingOut = new Set<string>()
  const pendingIn: string[] = []
  for (const c of rows) {
    const peer = peerOf(c, myId)
    if (c.status === 'accepted') accepted.add(peer)
    else if (c.status === 'pending') {
      if (c.target_id === myId) pendingIn.push(c.user_id)
      else if (c.user_id === myId) pendingOut.add(c.target_id)
    }
  }
  return { accepted, pendingOut, pendingIn, rows }
}

export async function sendConnectionRequest(
  myId: string,
  peerId: string
): Promise<{ ok: boolean; error?: string; status?: ConnStatus }> {
  if (!myId || !peerId) return { ok: false, error: 'Missing user' }
  if (myId === peerId) return { ok: false, error: 'Cannot connect to yourself' }

  const { data: existing } = await supabase
    .from('connections')
    .select('id, user_id, target_id, status')
    .or(
      `and(user_id.eq.${myId},target_id.eq.${peerId}),and(user_id.eq.${peerId},target_id.eq.${myId})`
    )
    .maybeSingle()

  if (existing) {
    if (existing.status === 'accepted') return { ok: false, error: 'Already connected', status: 'accepted' }
    if (existing.status === 'pending') {
      if (existing.user_id === peerId && existing.target_id === myId) {
        return acceptConnection(myId, peerId)
      }
      return { ok: false, error: 'Already requested', status: 'pending' }
    }
  }

  const { error } = await supabase.from('connections').insert({
    user_id: myId,
    target_id: peerId,
    status: 'pending',
  })
  if (error) {
    if (error.code === '23505' || (error.message || '').toLowerCase().includes('duplicate')) {
      return { ok: false, error: 'Already requested' }
    }
    if (error.code === '42P01' || (error.message || '').includes('relation')) {
      return { ok: false, error: 'Connections table missing — run sql/connections_secure.sql' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, status: 'pending' }
}

export async function acceptConnection(
  myId: string,
  fromId: string
): Promise<{ ok: boolean; error?: string; status?: ConnStatus }> {
  const { data, error } = await supabase
    .from('connections')
    .update({ status: 'accepted' })
    .eq('user_id', fromId)
    .eq('target_id', myId)
    .eq('status', 'pending')
    .select('id')
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'No pending request' }
  return { ok: true, status: 'accepted' }
}

export async function rejectConnection(myId: string, fromId: string) {
  const { error } = await supabase
    .from('connections')
    .update({ status: 'rejected' })
    .eq('user_id', fromId)
    .eq('target_id', myId)
    .eq('status', 'pending')
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function cancelOutgoing(myId: string, peerId: string) {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('user_id', myId)
    .eq('target_id', peerId)
    .eq('status', 'pending')
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function removeConnection(myId: string, peerId: string) {
  const { error } = await supabase
    .from('connections')
    .delete()
    .or(
      `and(user_id.eq.${myId},target_id.eq.${peerId}),and(user_id.eq.${peerId},target_id.eq.${myId})`
    )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
