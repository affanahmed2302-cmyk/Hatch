import { supabase } from './supabase'

/**
 * Hard isolation after block:
 * - No messages, pinches, radar, or profile contact either direction
 * - Soft UX: other person just "disappears" (no dramatic ban message to them)
 */

export async function blockUser(blockerId: string, blockedId: string) {
  if (!blockerId || !blockedId || blockerId === blockedId) {
    return { ok: false as const, error: 'Invalid' }
  }
  try {
    const { error } = await supabase.from('user_blocks').upsert(
      {
        blocker_id: blockerId,
        blocked_id: blockedId,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'blocker_id,blocked_id' }
    )
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Block failed' }
  }
}

export async function unblockUser(blockerId: string, blockedId: string) {
  try {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Unblock failed' }
  }
}

/** True if either side blocked the other */
export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false
  try {
    const { data } = await supabase
      .from('user_blocks')
      .select('id')
      .or(
        `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`
      )
      .limit(1)
    return !!(data && data.length)
  } catch {
    return false
  }
}

/** IDs this user has blocked or been blocked by */
export async function getIsolationSet(userId: string): Promise<Set<string>> {
  const set = new Set<string>()
  if (!userId) return set
  try {
    const { data } = await supabase
      .from('user_blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
    for (const row of data || []) {
      if (row.blocker_id === userId) set.add(row.blocked_id)
      else set.add(row.blocker_id)
    }
  } catch {
    /* table may not exist yet */
  }
  return set
}

export function filterIsolated<T extends { id?: string; user_id?: string; sender_id?: string; receiver_id?: string }>(
  rows: T[],
  isolated: Set<string>,
  myId: string
): T[] {
  if (!isolated.size) return rows
  return rows.filter((r) => {
    const peers = [r.id, r.user_id, r.sender_id, r.receiver_id].filter(Boolean) as string[]
    return !peers.some((p) => p !== myId && isolated.has(p))
  })
}
