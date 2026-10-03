import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  // Basic CSP — allow Supabase + Jitsi + Razorpay
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com",
      "frame-src 'self' https://meet.jit.si https://api.razorpay.com https://checkout.razorpay.com",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )

  // Block common scanner paths
  const p = req.nextUrl.pathname.toLowerCase()
  if (
    p.includes('wp-admin') ||
    p.includes('wp-login') ||
    p.includes('.env') ||
    p.includes('phpmyadmin') ||
    p.endsWith('.php')
  ) {
    return new NextResponse('Not found', { status: 404 })
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.json).*)'],
}
