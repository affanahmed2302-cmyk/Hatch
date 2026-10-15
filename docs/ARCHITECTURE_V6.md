# Hatch v6 — Dual-Mode Architecture (Primeora Solutions)

**Audience:** BMSCE students · **Stack:** Next.js 15 · Supabase · Vercel · Razorpay · Google Calendar

## Modes

| Mode | Route hub | Focus |
|------|-----------|--------|
| Professional | `/pro` | Schedule, attendance, vault, placement, focus, bounties |
| Social | `/social` | I'm Free, Lounge, Night notes, Circles, Squads, Escapes |
| Both | Settings + Home | Combined home grids |

Toggle: `ModeToggle` → `profiles.profile_mode` + `localStorage`.

## Mapping (spec → current / next)

### Professional (20)
1. Smart-Sync Schedule → `/schedule` + `/api/calendar/sync`
2. Adaptive Re-Scheduler → `calendar_events.is_adaptive`
3. Attendance margin → `/attendance` + `attendance_logs`
4. Exam countdown → schedule + vault modules
5. Classroom Vault / PYQ → `/vault` + `vault_items`
6. Tech-Twin → `/discover`
7. Hatch Resume → `/profile`
8. Placement Radar → `/tools`
9. Mock interviews → chat + Jitsi (existing calls)
10. Proof-of-work badges → clubs + rep_score
11. Focus Room → `/focus` + `focus_sessions`
12. Bounty Board → `/bounties` + `bounties`
13. Split expense → tools (next)
14. Resource Locker → tools links
15. Elective insights → vault ratings (next)
16. Razorpay VIP → `/api/razorpay/order`
17. AI syllabus → edge function (next, needs LLM key)
18. Lab sandbox → vault links
19. Task matrix → schedule statuses
20. Productivity score → `profiles.productivity_score`

### Social (20) — official-safe labels
1. Squad Wars → `squads.clout_points` + `/clubs`
2. Pass Drops → `hatch_events` + Razorpay
3. Vibe check → post-event on clubs
4. Club bounties → `bounties`
5. Hype feed → Pulse / lounge media
6. Midnight Run → `/confessions` + `midnight_feed` (10pm–5am)
7. Heatmap → `/radar`
8. Circles (not “dating”) → `/sparks`
9. Spotted / shoutouts → Pulse anonymous
10. Polls → club events / trip polls
11. Digital ID → profile QR (next)
12. Who's Free → I'm Free on Home
13. Sub-rooms → Lounge channels
14. Audio hangouts → Jitsi audio
15. Flea market → Hostel market
16. Hatch Coins → `profiles.hatch_coins`
17. Meme wall → Pulse category
18. Streaks → existing engagement
19. Fest hub → clubs + events
20. Hatch Escapes → `trip_polls` + `/escapes`

## Env (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

## SQL
Run `sql/hatch_v6_modes.sql` in Supabase.

## Ship order
1. SQL migration
2. Mode toggle on Home / Settings (done foundation)
3. Calendar OAuth + adaptive moves
4. Razorpay Pass Drops
5. Escapes weekly poll
6. Vault + attendance UIs
