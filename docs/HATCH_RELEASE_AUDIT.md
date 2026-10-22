# HATCH Release Audit

**Date:** 2026-10-22  
**Live URL:** https://hatch-primeora.vercel.app  
**Branch:** stable-plus  
**Stack:** Next.js 15 · Supabase · Vercel  
**Env present:** NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

## Baseline (runtime evidence)

| Check | Result |
|-------|--------|
| HTTPS production responds 200 | VERIFIED |
| Security headers (CSP, XFO, nosniff, HSTS) | VERIFIED (middleware + Vercel) |
| Landing branding / Enter Hatch / Sign in | VERIFIED (mobile screenshot) |
| Login page renders Google + email path | VERIFIED |
| Unauth /discover → login redirect | VERIFIED |
| PWA manifest + icon | VERIFIED (network) |
| College email gate (.ac.in / blocked Gmail) | IMPLEMENTED — UNVERIFIED end-to-end Google OAuth |
| Connections helpers + Discover | IMPLEMENTED — UNVERIFIED (needs logged-in E2E) |
| Pulse post author_id fix | IMPLEMENTED — UNVERIFIED on live after deploy |
| Confessions server window API | IMPLEMENTED — UNVERIFIED |
| Circles/Spark | DISABLED INTENTIONALLY (feature_sparks=false) |
| Automated tests | NOT STARTED (no test script in package.json) |
| Google OAuth full signup | BLOCKED until Console redirect/client match verified by operator |

## Critical path risks
1. **Google OAuth** historically failed (invalid_client / redirect_uri) — must be confirmed by founder in Google Cloud + Supabase providers.
2. **No automated tests** — regressions only caught manually.
3. **Schema drift** (user_id vs author_id, connections columns) — partially fixed; remaining tables need operator SQL discipline.
4. **userScalable:false** blocked zoom (a11y) — fixed in this release batch.

## Feature surface
~65 page routes. Core student path: Landing → Login → Home → Discover → Connect → Chat → Profile → More tools.
