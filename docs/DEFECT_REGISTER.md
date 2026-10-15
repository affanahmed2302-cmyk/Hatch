# Hatch defect register (rescue v5.23)

| ID | Feature | Severity | Root cause | Fix | Status |
|----|---------|----------|------------|-----|--------|
| D1 | Startup double splash | P1 | Version force-reload + splash every HTML load | Session key + no auto-reload | Fixed prior |
| D2 | Nav vs Home duplicates | P1 | Same destinations in grid + footer | Nav: Home/Discover/Lounge/Chats/More; Home next-steps only | Fixed v5.23 |
| D3 | Circles → Spark offline | P1 | `feature_sparks && dating_app_active` dual gate + dead UI | Circles = feature_sparks only; clean paused page | Fixed v5.23 |
| D4 | Night Notes naming | P2 | Product rename drift | User-facing **Confessions**; window from app_settings IST | Fixed v5.23 |
| D5 | Lounge profile click | P1 | Name not linked | General lounge → Link `/u/[id]` | Fixed v5.23 |
| D6 | Chat lag / Jitsi | P1 | Full reload + Jitsi iframe | Optimistic chat; Jitsi removed | Fixed prior |
| D7 | Google new users | P1 | OAuth exchange + Redirect URL | Robust finalize; needs Supabase URL config | Code fixed; env manual |
| D8 | Pinch spam / block | P2 | No isolation table | blocks + pinch limits SQL | Code ready |
| D9 | Confessions 10–5 | Info | Configurable 22–5 IST overnight | Documented; admin keys | Verified logic |

## Intentionally disabled until founder enables
- Circles (`feature_sparks` in Pilot / app_settings)

## Manual blockers
- Supabase Redirect URL for Google OAuth
- Run `sql/blocks_pinches.sql`, `sql/confessions.sql` if tables missing
