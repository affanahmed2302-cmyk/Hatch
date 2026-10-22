# HATCH Release Fix Log

## 2026-10-22

### FIX-1 Pulse schema mismatch (CRITICAL)
- **Symptom:** `Could not find the 'user_id' column of 'pulse_posts'`
- **Root cause:** DB column is `author_id`; app inserted `user_id`
- **Fix:** `postPulse` / `deletePulse` use `author_id`
- **Files:** `src/lib/supabase.ts`
- **Status:** Deployed

### FIX-2 Connections helpers
- **Root cause:** Raw inserts; duplicate/race risk
- **Fix:** `src/lib/connections.ts` + Discover wired
- **Status:** Deployed; E2E NOT TESTED

### FIX-3 Confessions client-only window
- **Fix:** `/api/confessions` enforces IST window + JWT
- **Status:** Deployed; E2E NOT TESTED

### FIX-4 Accessibility viewport
- **Symptom:** `userScalable: false` / `maximumScale: 1` blocks zoom
- **Fix:** Allow user scaling (WCAG)
- **Files:** `src/app/layout.tsx`
- **Status:** This batch

### FIX-5 Login copy for wrong mail
- **Fix:** Prefer explicit “Please use your college mail id” on gate failure
- **Files:** `src/app/login/page.tsx`
- **Status:** This batch
