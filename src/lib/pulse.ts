import { supabase } from './supabase'
import { notifyMessagePush } from './pushClient'

export async function replyToPulse(postId: string, userId: string, content: string, postAuthorId?: string) {
  const text = content.trim()
  if (!text || text.length > 200) return { ok: false as const, error: '1-200 characters' }
  try {
    const { data, error } = await supabase
      .from('pulse_replies')
      .insert({
        post_id: postId,
        author_id: userId,
        content: text,
      })
      .select('id, post_id, author_id, content, created_at')
      .single()
    if (error) {
      return {
        ok: false as const,
        error:
          error.message.includes('pulse_replies') || error.code === '42P01'
            ? 'Run pulse_replies SQL in Supabase first'
            : error.message,
      }
    }
    if (postAuthorId && postAuthorId !== userId) {
      void notifyMessagePush(postAuthorId, 'Pulse reply', text.slice(0, 80))
    }
    return { ok: true as const, data, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Reply failed' }
  }
}

export async function fetchPulseReplies(postId: string) {
  try {
    const { data, error } = await supabase
      .from('pulse_replies')
      .select('id, post_id, author_id, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(40)
    if (error) return []
    if (!data?.length) return []
    const ids = [...new Set(data.map((r) => r.author_id))]
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', ids)
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    return data.map((r) => ({ ...r, profile: map[r.author_id] }))
  } catch {
    return []
  }
}
