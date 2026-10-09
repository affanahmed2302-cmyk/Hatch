import { supabase } from './supabase'

export type ScheduleKind = 'class' | 'activity' | 'goal'

export type ScheduleItem = {
  id: string
  user_id: string
  kind: ScheduleKind
  title: string
  subtitle?: string | null
  location?: string | null
  day_of_week?: number | null
  start_time?: string | null
  end_time?: string | null
  due_at?: string | null
  remind_minutes?: number
  color?: string | null
  notes?: string | null
  active?: boolean
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function fetchSchedule(userId: string): Promise<ScheduleItem[]> {
  try {
    const { data, error } = await supabase
      .from('schedule_items')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('start_time', { ascending: true })
    if (error || !data) return []
    return data as ScheduleItem[]
  } catch {
    return []
  }
}

export async function addScheduleItem(
  userId: string,
  item: Partial<ScheduleItem> & { kind: ScheduleKind; title: string }
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const title = item.title.trim()
  if (!title) return { ok: false, error: 'Title required' }
  const payload: any = {
    user_id: userId,
    kind: item.kind,
    title,
    subtitle: item.subtitle?.trim() || null,
    location: item.location?.trim() || null,
    day_of_week: item.day_of_week ?? null,
    start_time: item.start_time || null,
    end_time: item.end_time || null,
    due_at: item.due_at || null,
    remind_minutes: item.remind_minutes ?? 10,
    color: item.color || (item.kind === 'class' ? '#8b5cf6' : item.kind === 'goal' ? '#f59e0b' : '#10b981'),
    notes: item.notes?.trim() || null,
    active: true,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from('schedule_items').insert(payload).select('id').single()
  if (error) {
    return {
      ok: false,
      error:
        error.message.includes('schedule_items') || error.code === '42P01'
          ? 'Run hatch_schedule.sql in Supabase first'
          : error.message,
    }
  }
  return { ok: true, id: data?.id }
}

export async function deleteScheduleItem(id: string, userId: string) {
  const { error } = await supabase.from('schedule_items').delete().eq('id', id).eq('user_id', userId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

/** Next occurrence of a weekly HH:MM on a given day_of_week */
export function nextOccurrence(dayOfWeek: number, timeHHMM: string, from = new Date()): Date {
  const [h, m] = timeHHMM.split(':').map(Number)
  const d = new Date(from)
  d.setSeconds(0, 0)
  const cur = d.getDay()
  let add = (dayOfWeek - cur + 7) % 7
  d.setDate(d.getDate() + add)
  d.setHours(h || 0, m || 0, 0, 0)
  if (d.getTime() <= from.getTime()) {
    d.setDate(d.getDate() + 7)
  }
  return d
}

export function itemsForDay(items: ScheduleItem[], dayOfWeek: number): ScheduleItem[] {
  return items
    .filter((i) => i.kind !== 'goal' && i.day_of_week === dayOfWeek && i.start_time)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
}

export function upcomingGoals(items: ScheduleItem[]): ScheduleItem[] {
  const now = Date.now()
  return items
    .filter((i) => i.kind === 'goal' && i.due_at && new Date(i.due_at).getTime() > now - 86400000)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
}

/** Build ICS for Google Calendar / Apple Calendar import */
export function buildIcs(items: ScheduleItem[], studentName = 'Student'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hatch//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Hatch Schedule (${studentName})`,
  ]

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

  for (const it of items) {
    if (it.kind === 'goal' && it.due_at) {
      const due = new Date(it.due_at)
      const ds = formatIcsLocal(due)
      const de = formatIcsLocal(new Date(due.getTime() + 30 * 60000))
      lines.push(
        'BEGIN:VEVENT',
        `UID:hatch-goal-${it.id}@hatch`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${ds}`,
        `DTEND:${de}`,
        `SUMMARY:${escapeIcs(it.title)}`,
        it.notes ? `DESCRIPTION:${escapeIcs(it.notes)}` : '',
        `BEGIN:VALARM`,
        `TRIGGER:-PT${it.remind_minutes || 10}M`,
        `ACTION:DISPLAY`,
        `DESCRIPTION:Reminder`,
        `END:VALARM`,
        'END:VEVENT'
      )
      continue
    }

    if (it.day_of_week == null || !it.start_time) continue
    const start = nextOccurrence(it.day_of_week, it.start_time)
    const end = it.end_time
      ? nextOccurrence(it.day_of_week, it.end_time, new Date(start.getTime() - 60000))
      : new Date(start.getTime() + 60 * 60000)
    if (end <= start) end.setTime(start.getTime() + 60 * 60000)

    const byday = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][it.day_of_week]
    lines.push(
      'BEGIN:VEVENT',
      `UID:hatch-${it.id}@hatch`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsLocal(start)}`,
      `DTEND:${formatIcsLocal(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
      `SUMMARY:${escapeIcs(it.title)}`,
      it.location ? `LOCATION:${escapeIcs(it.location)}` : '',
      it.subtitle || it.notes
        ? `DESCRIPTION:${escapeIcs([it.subtitle, it.notes].filter(Boolean).join(' · '))}`
        : '',
      `BEGIN:VALARM`,
      `TRIGGER:-PT${it.remind_minutes || 10}M`,
      `ACTION:DISPLAY`,
      `DESCRIPTION:Reminder`,
      `END:VALARM`,
      'END:VEVENT'
    )
  }

  lines.push('END:VCALENDAR')
  return lines.filter(Boolean).join('\r\n')
}

function formatIcsLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function downloadIcs(ics: string, filename = 'hatch-schedule.ics') {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Schedule browser notifications 10 min before next occurrences (while app/PWA is usable) */
const scheduledTimers = new Map<string, number>()

export function armReminders(items: ScheduleItem[], notify: (title: string, body: string) => void) {
  if (typeof window === 'undefined') return
  scheduledTimers.forEach((t) => clearTimeout(t))
  scheduledTimers.clear()

  const now = Date.now()
  for (const it of items) {
    const mins = it.remind_minutes ?? 10
    let when: Date | null = null
    if (it.kind === 'goal' && it.due_at) {
      when = new Date(new Date(it.due_at).getTime() - mins * 60000)
    } else if (it.day_of_week != null && it.start_time) {
      const start = nextOccurrence(it.day_of_week, it.start_time)
      when = new Date(start.getTime() - mins * 60000)
    }
    if (!when || when.getTime() <= now) continue
    const delay = when.getTime() - now
    if (delay > 7 * 86400000) continue // only arm within 7 days
    const id = it.id
    const t = window.setTimeout(() => {
      notify(
        it.kind === 'goal' ? 'Goal reminder' : 'Class / activity soon',
        `${it.title}${it.location ? ' · ' + it.location : ''} — starts in ${mins} min`
      )
      scheduledTimers.delete(id)
    }, delay)
    scheduledTimers.set(id, t)
  }
}
