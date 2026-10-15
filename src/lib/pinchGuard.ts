import { supabase } from './supabase'
import { isBlockedEitherWay } from './blocks'

/**
 * Pinch / poke spam protection:
 * - Max 3 pinches per hour to the same person
 * - Max 20 pinches total per hour
 * - Blocked pairs cannot pinch either way
 */

const HOUR_MS = 60 * 60 * 1000

export async function canPinch(
  fromId: string,
  toId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!fromId || !toId || fromId === toId) {
    return { ok: false, error: 'Invalid' }
  }
  if (await isBlockedEitherWay(fromId, toId)) {
    return { ok: false, error: 'Unavailable' } // soft — no "you are blocked" leak
  }

  const since = new Date(Date.now() - HOUR_MS).toISOString()
  try {
    const { count: toSame } = await supabase
      .from('pinches')
      .select('id', { count: 'exact', head: true })
      .eq('from_id', fromId)
      .eq('to_id', toId)
      .gte('created_at', since)

    if ((toSame || 0) >= 3) {
      return { ok: false, error: 'Slow down — max 3 pinches/hour to the same person' }
    }

    const { count: total } = await supabase
      .from('pinches')
      .select('id', { count: 'exact', head: true })
      .eq('from_id', fromId)
      .gte('created_at', since)

    if ((total || 0) >= 20) {
      return { ok: false, error: 'Hourly pinch limit reached — try later' }
    }
  } catch {
    // table missing — allow but client rate-limit still applies
  }
  return { ok: true }
}

export async function sendPinch(fromId: string, toId: string) {
  const gate = await canPinch(fromId, toId)
  if (!gate.ok) return { ok: false as const, error: gate.error }
  try {
    const { error } = await supabase.from('pinches').insert({
      from_id: fromId,
      to_id: toId,
      created_at: new Date().toISOString(),
    })
    if (error) {
      if (error.message.includes('relation')) {
        return { ok: false as const, error: 'Run sql/blocks_pinches.sql in Supabase' }
      }
      return { ok: false as const, error: error.message }
    }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Pinch failed' }
  }
}
