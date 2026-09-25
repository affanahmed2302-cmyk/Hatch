import { supabase } from './supabase'

export const ZONES = ['Library', 'Canteen', 'Lab', 'Hostel', 'Quad', 'Classroom', 'Off campus'] as const

export async function getTodayVibe(userId: string) {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { data, error } = await supabase
      .from('vibe_checks')
      .select('*')
      .eq('user_id', userId)
      .eq('check_date', today)
      .maybeSingle()
    if (error) return { ok: false as const, data: null, error: error.message }
    return { ok: true as const, data, error: null }
  } catch (e: any) {
    return { ok: false as const, data: null, error: e?.message || 'Failed' }
  }
}

export async function setTodayVibe(userId: string, zone: string) {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const { data, error } = await supabase
      .from('vibe_checks')
      .upsert(
        { user_id: userId, zone, check_date: today },
        { onConflict: 'user_id,check_date' },
      )
      .select('*')
      .single()
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, data, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function fetchPerks() {
  try {
    const { data, error } = await supabase
      .from('campus_perks')
      .select('*')
      .eq('is_active', true)
      .order('category')
    if (error) return { ok: false as const, data: [], error: error.message }
    return { ok: true as const, data: data || [], error: null }
  } catch (e: any) {
    return { ok: false as const, data: [], error: e?.message || 'Failed' }
  }
}
