import { supabase, jitsiRoom, jitsiEmbedUrl } from './supabase'

export type CallRow = {
  id: string
  caller_id: string
  callee_id: string
  room_id: string
  call_type: 'audio' | 'video'
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed'
  created_at: string
}

export async function startCall(callerId: string, calleeId: string, callType: 'audio' | 'video') {
  try {
    await supabase.from('calls')
      .update({ status: 'ended' })
      .or(`and(caller_id.eq.${callerId},callee_id.eq.${calleeId}),and(caller_id.eq.${calleeId},callee_id.eq.${callerId})`)
      .in('status', ['ringing', 'accepted'])

    const room = jitsiRoom('dm', [callerId, calleeId].sort().join(''))
    const { data, error } = await supabase.from('calls').insert({
      caller_id: callerId,
      callee_id: calleeId,
      room_id: room,
      call_type: callType,
      status: 'ringing',
    }).select('*').single()

    if (error) {
      return {
        ok: false as const,
        error: error.message.includes('relation') || error.code === '42P01'
          ? 'calls table missing — run SQL in Supabase'
          : error.message,
        call: null,
      }
    }
    return { ok: true as const, error: null, call: data as CallRow }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Call failed', call: null }
  }
}

export async function respondCall(callId: string, accept: boolean) {
  const status = accept ? 'accepted' : 'rejected'
  const { data, error } = await supabase.from('calls').update({ status }).eq('id', callId).select('*').single()
  if (error) return { ok: false as const, error: error.message, call: null }
  return { ok: true as const, error: null, call: data as CallRow }
}

export async function endCall(callId: string) {
  await supabase.from('calls').update({ status: 'ended' }).eq('id', callId)
}

export function callEmbedUrl(call: CallRow, myName: string) {
  return jitsiEmbedUrl(call.room_id, call.call_type === 'audio', myName)
}

export async function fetchActiveIncoming(userId: string) {
  try {
    const { data } = await supabase
      .from('calls')
      .select('*')
      .eq('callee_id', userId)
      .eq('status', 'ringing')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data as CallRow) || null
  } catch {
    return null
  }
}
