import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Calendar bi-directional sync stub.
 * Production: OAuth tokens in Supabase (user-scoped), googleapis calendar.events.list + insert.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body.userId as string | undefined
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })
    }

    const hasGoogle =
      !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

    if (!hasGoogle) {
      return NextResponse.json({
        ok: false,
        error: 'Google Calendar not configured — set GOOGLE_CLIENT_ID / SECRET on Vercel',
        stub: true,
      })
    }

    // TODO: load refresh token for userId, call calendar.events.list, upsert calendar_events
    return NextResponse.json({
      ok: true,
      message: 'Sync endpoint ready — connect Google OAuth tokens to complete',
      imported: 0,
      exported: 0,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Sync failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'hatch-calendar-sync',
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  })
}
