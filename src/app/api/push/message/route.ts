import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT } from '@/lib/vapid'

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ahtabgrlkyjjjqxvndlb.supabase.co'
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_3YcwyaHxFjIcacIPNsxDWQ_IreLbFRE'
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
    const body = await req.json()
    const receiverId = String(body.receiver_id || '')
    const senderName = String(body.sender_name || 'Someone')
    const preview = String(body.preview || 'New message').slice(0, 120)
    if (!receiverId) return NextResponse.json({ error: 'receiver_id required' }, { status: 400 })

    const { data: subs } = await sb().from('push_subs').select('*').eq('user_id', receiverId)
    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

    const payload = JSON.stringify({
      title: senderName,
      body: preview,
      url: '/inbox',
      tag: 'hatch-msg',
      type: 'message',
    })

    let sent = 0
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { urgency: 'normal', TTL: 300 }
        )
        sent++
      } catch (e: any) {
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          await sb().from('push_subs').delete().eq('endpoint', s.endpoint)
        }
      }
    }
    return NextResponse.json({ ok: true, sent })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'push failed' }, { status: 500 })
  }
}
