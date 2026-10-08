import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT } from '@/lib/vapid'

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ahtabgrlkyjjjqxvndlb.supabase.co'
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  return runNudge(req)
}

export async function POST(req: NextRequest) {
  return runNudge(req)
}

async function runNudge(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET || ''
    const auth = req.headers.get('authorization') || ''
    const q = req.nextUrl.searchParams.get('secret') || ''
    if (secret && auth !== `Bearer ${secret}` && q !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
    const client = sb()

    const { data: users } = await client
      .from('profiles')
      .select('id, full_name, phone, daily_nudge, last_daily_nudge_at')
      .or('daily_nudge.is.null,daily_nudge.eq.true')
      .limit(500)

    const now = Date.now()
    let sent = 0
    let skipped = 0

    for (const u of users || []) {
      if (u.last_daily_nudge_at) {
        const last = new Date(u.last_daily_nudge_at).getTime()
        if (now - last < 20 * 60 * 60 * 1000) {
          skipped++
          continue
        }
      }

      const { data: subs } = await client.from('push_subs').select('*').eq('user_id', u.id)
      if (!subs?.length) {
        skipped++
        continue
      }

      const name = (u.full_name || 'there').split(' ')[0]
      const payload = JSON.stringify({
        title: 'Hatch · evening campus',
        body: `Hey ${name} — peak time. Drop an I'm Free or Pulse and see who's around.`,
        url: '/home',
        tag: 'hatch-daily',
        type: 'daily',
      })

      let ok = 0
      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { urgency: 'normal', TTL: 3600 }
          )
          ok++
        } catch (e: any) {
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await client.from('push_subs').delete().eq('endpoint', s.endpoint)
          }
        }
      }

      if (ok > 0) {
        sent++
        await client
          .from('profiles')
          .update({ last_daily_nudge_at: new Date().toISOString() })
          .eq('id', u.id)
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      skipped,
      note: 'Web Push only. SMS needs Twilio later.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'nudge failed' }, { status: 500 })
  }
}
