# MESH — Find your people

Campus networking platform initially for BMS College students.

**Core loop:** Discover → Match → Connect → Collaborate → Build

## Phase 1 Features (Implemented)

- Beautiful dark, mobile-first UI
- Landing page
- Multi-step signup / onboarding (college, branch, year, skills, interests, looking-for)
- Login
- Discover feed with skill-based matching + match explanations
- "It's a Match" modal
- Student profile page
- Super Admin login with **first-time secure setup** (no hardcoded password)
- Super Admin dashboard (users overview, basic stats)
- PWA manifest (installable)
- Multi-college ready architecture (starts with BMS)

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Zustand (state)
- Framer Motion
- Lucide icons

## Getting Started

```bash
cd mesh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Admin Access

1. Go to `/admin/login`
2. On first visit you will be prompted to **create** the Super Admin username + password
3. After setup, use those credentials to log in to `/admin/dashboard`

**Never commit real admin credentials.**

## Project Structure

```
src/
  app/
    page.tsx              # Landing
    login/                # Student login
    signup/               # Multi-step onboarding
    discover/             # Matching cards
    profile/              # Student profile
    admin/login/          # Super Admin login + first-time setup
    admin/dashboard/      # Admin panel
  components/
  lib/
    matching.ts           # Matching engine
    utils.ts
  store/useStore.ts       # Client state
  types/index.ts
```

## Next Phases (Planned)

- Real backend (Supabase / Postgres)
- Real-time chat
- Teams & Team Rooms
- Projects, Clubs, Events, Campus Feed
- AI matching enhancements
- MESH+ (₹99/month) + Razorpay
- Advanced moderation & feature flags
- Cross-college expansion

## Deployment

Recommended: push to GitHub → connect to Vercel.

Set environment variables as needed when adding real auth, database and payments.

## License

Private / All rights reserved for the project owner.
