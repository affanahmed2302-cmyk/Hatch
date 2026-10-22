# HATCH Release Report

**Date:** 2026-10-22  
**Overall readiness:** **SOFT LAUNCH only** — public URL works; core auth OAuth not verified in this pass; no automated test suite.

## 1. Readiness
Not full production-ready for unattended mass onboarding until Google OAuth and logged-in journeys are human-verified.

## 2–3. Defects & root causes
| Defect | Root cause | Status |
|--------|------------|--------|
| Pulse insert schema cache error | user_id vs author_id | FIXED |
| Spark offline message | feature flag off | INTENDED |
| Zoom disabled | viewport maximumScale/userScalable | FIXED this batch |
| Historical OAuth invalid_client | Google/Supabase client mismatch | BLOCKED on operator |

## 4–5. Files / backend
Changed recently: `src/lib/supabase.ts`, `src/lib/connections.ts`, Discover, confessions API, layout viewport, login copy, release docs.

## 6. Security
Headers present. College email gate present. RLS policies uneven (connections SQL provided). Secrets not printed. Anon key is public by design.

## 7. Performance
No Core Web Vitals lab numbers claimed. Landing loads; many client components may still cost TTI.

## 8–9. Tests
PASS: public load, login render, redirect, headers.  
NOT TESTED: authenticated journeys.  
SKIP: automated suite (missing).

## 10. Critical journeys
Public: PASS.  
Join via Google: BLOCKED pending operator.  
Discover/connect/chat: IMPLEMENTED — UNVERIFIED.

## 11–12. Incomplete / risks
Stories, reels, polls, group chat, AI coach — incomplete. Schema drift risk remains.

## 13–14. Deploy
Production alias: **https://hatch-primeora.vercel.app** (READY deployments observed).

## 15. Manual steps for founder
1. Verify Google OAuth Client ID/Secret in Supabase Auth → Providers match Google Cloud.
2. Authorized redirect URI = `https://ahtabgrlkyjjjqxvndlb.supabase.co/auth/v1/callback`
3. Run `sql/connections_secure.sql`
4. Test one full signup with real .ac.in Google account
5. Test Discover connect + chat + pulse

## 16. Monitoring
Watch Vercel function logs and Supabase Auth logs for OAuth failures after invite wave.
