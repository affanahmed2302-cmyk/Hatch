import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseUser(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

function hourIST(d = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(d)
  )
}

function windowOpen(start: number, end: number, h: number) {
  if (start === end) return true
  if (start < end) return h >= start && h < end
  return h >= start || h < end
}

async function readWindow(sb: ReturnType<typeof supabaseUser>) {
  let start = 22
  let end = 5
  let featureOn = true
  try {
    const { data } = await sb
      .from('app_settings')
      .select('key, value')
      .in('key', ['confession_window_start', 'confession_window_end', 'feature_confessions'])
    for (const row of data || []) {
      if (row.key === 'feature_confessions') {
        featureOn = String(row.value).toLowerCase() === 'true'
      }
      const n = parseInt(String(row.value), 10)
      if (Number.isNaN(n) || n < 0 || n > 23) continue
      if (row.key === 'confession_window_start') start = n
      if (row.key === 'confession_window_end') end = n
    }
  } catch {
    /* defaults */
  }
  return { start, end, featureOn }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = supabaseUser(token)
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await sb
    .from('confessions')
    .select('id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes('relation')
          ? 'Run sql/confessions.sql in Supabase'
          : error.message,
      },
      { status: 500 }
    )
  }

  const { start, end, featureOn } = await readWindow(sb)
  return NextResponse.json({
    items: data || [],
    open: featureOn && windowOpen(start, end, hourIST()),
    window: { start, end },
  })
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = supabaseUser(token)
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { start, end, featureOn } = await readWindow(sb)
  if (!featureOn) {
    return NextResponse.json({ error: 'Confessions is disabled' }, { status: 403 })
  }
  if (!windowOpen(start, end, hourIST())) {
    return NextResponse.json(
      { error: 'Confessions is closed right now (outside scheduled window)' },
      { status: 403 }
    )
  }

  let body: { content?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const content = String(body.content || '')
    .trim()
    .slice(0, 280)
  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const { error } = await sb.from('confessions').insert({
    author_id: user.id,
    content,
    is_anonymous: true,
  })

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes('relation')
          ? 'Run sql/confessions.sql in Supabase'
          : error.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
