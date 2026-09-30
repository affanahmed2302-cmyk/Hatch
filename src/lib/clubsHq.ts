import { supabase, isSuperAdmin } from './supabase'

/** Starter list — BMSCE-style clubs for bulk onboard */
export const SEED_CLUBS: { name: string; category: string; description: string }[] = [
  { name: 'Coding Club', category: 'Tech', description: 'Hackathons, DSA, open source' },
  { name: 'IEEE BMSCE', category: 'Tech', description: 'IEEE student branch' },
  { name: 'CSI BMSCE', category: 'Tech', description: 'Computer Society of India' },
  { name: 'Robotics Club', category: 'Tech', description: 'Bots, embedded, competitions' },
  { name: 'AI / ML Club', category: 'Tech', description: 'ML papers, projects, workshops' },
  { name: 'Web Dev Club', category: 'Tech', description: 'Frontend, backend, product builds' },
  { name: 'Cybersecurity Club', category: 'Tech', description: 'CTFs, security awareness' },
  { name: 'Game Dev Club', category: 'Tech', description: 'Unity, Unreal, game jams' },
  { name: 'Entrepreneurship Cell', category: 'Academic', description: 'Startups, pitch, funding' },
  { name: 'Finance Club', category: 'Academic', description: 'Markets, case comps' },
  { name: 'Debate Society', category: 'Academic', description: 'Parliamentary & Asian formats' },
  { name: 'Literary Club', category: 'Cultural', description: 'Writing, poetry, open mic' },
  { name: 'Music Club', category: 'Cultural', description: 'Bands, jams, college fests' },
  { name: 'Dance Club', category: 'Cultural', description: 'Western, classical, freestyle' },
  { name: 'Drama / Theatre', category: 'Cultural', description: 'Stage plays & street theatre' },
  { name: 'Photography Club', category: 'Cultural', description: 'Campus shoots & workshops' },
  { name: 'Film Club', category: 'Cultural', description: 'Screenings & short films' },
  { name: 'Art & Design Club', category: 'Cultural', description: 'Illustration, design sprints' },
  { name: 'Fashion Club', category: 'Cultural', description: 'Styling & campus shows' },
  { name: 'Quiz Club', category: 'Academic', description: 'General & specialty quizzes' },
  { name: 'Astronomy Club', category: 'Academic', description: 'Stargazing & talks' },
  { name: 'Environment Club', category: 'Social', description: 'Green campus initiatives' },
  { name: 'Social Service Club', category: 'Social', description: 'Volunteering & drives' },
  { name: 'Rotaract', category: 'Social', description: 'Community service' },
  { name: 'NSS Unit', category: 'Social', description: 'National Service Scheme' },
  { name: 'NCC', category: 'Social', description: 'National Cadet Corps' },
  { name: 'Football Club', category: 'Sports', description: 'Inter-dept football' },
  { name: 'Cricket Club', category: 'Sports', description: 'Campus cricket' },
  { name: 'Basketball Club', category: 'Sports', description: 'Court games & training' },
  { name: 'Badminton Club', category: 'Sports', description: 'Indoor courts' },
  { name: 'Table Tennis Club', category: 'Sports', description: 'TT practice & matches' },
  { name: 'Athletics Club', category: 'Sports', description: 'Track & field' },
  { name: 'Yoga & Wellness', category: 'Sports', description: 'Fitness & mindfulness' },
  { name: 'Chess Club', category: 'Sports', description: 'Tournaments & rapid play' },
  { name: 'E-Sports Club', category: 'Sports', description: 'Competitive gaming' },
  { name: 'Women in Tech', category: 'Tech', description: 'Mentorship & community' },
  { name: 'Open Source Club', category: 'Tech', description: 'FOSS contributions' },
  { name: 'Product Club', category: 'Tech', description: 'PM, design, build' },
  { name: 'Data Science Club', category: 'Tech', description: 'Analytics & viz' },
  { name: 'Blockchain Club', category: 'Tech', description: 'Web3 experiments' },
  { name: 'IoT Club', category: 'Tech', description: 'Sensors & hardware' },
  { name: 'Design Thinking Club', category: 'Academic', description: 'UX workshops' },
  { name: 'Toastmasters', category: 'Academic', description: 'Public speaking' },
  { name: 'Language Club', category: 'Cultural', description: 'Languages & culture' },
  { name: 'Cooking Club', category: 'Social', description: 'Campus cook-offs' },
  { name: 'Travel Club', category: 'Social', description: 'Trips & treks' },
  { name: 'Book Club', category: 'Cultural', description: 'Monthly reads' },
  { name: 'Anime Club', category: 'Cultural', description: 'Screenings & fan art' },
  { name: 'Podcast Club', category: 'Cultural', description: 'Campus audio shows' },
  { name: 'Media Club', category: 'Cultural', description: 'Campus journalism' },
  { name: 'Event Management', category: 'Social', description: 'Fest ops & logistics' },
  { name: 'Alumni Connect', category: 'Academic', description: 'Alumni mentorship' },
  { name: 'Research Circle', category: 'Academic', description: 'Papers & labs' },
  { name: 'Math Circle', category: 'Academic', description: 'Problem solving' },
  { name: 'Physics Club', category: 'Academic', description: 'Experiments & talks' },
  { name: 'Chemistry Club', category: 'Academic', description: 'Lab culture' },
  { name: 'Bio Club', category: 'Academic', description: 'Life sciences' },
  { name: 'Civil Engg Society', category: 'Tech', description: 'Dept technical society' },
  { name: 'Mechanical Society', category: 'Tech', description: 'Mech projects' },
  { name: 'ECE Forum', category: 'Tech', description: 'Electronics forum' },
  { name: 'ISE Forum', category: 'Tech', description: 'Information science' },
  { name: 'CSE Forum', category: 'Tech', description: 'Computer science forum' },
  { name: 'MBA Club', category: 'Academic', description: 'Business cases' },
  { name: 'Placements Prep', category: 'Academic', description: 'Interview & resume drills' },
  { name: 'Hackathon Crew', category: 'Tech', description: 'Always shipping teams' },
]

export async function bulkSeedClubs(email: string | null | undefined, creatorId: string) {
  if (!isSuperAdmin(email)) return { ok: false as const, error: 'Super-admin only', created: 0 }
  const { data: existing } = await supabase.from('clubs').select('name')
  const have = new Set((existing || []).map((c: any) => String(c.name).toLowerCase()))
  let created = 0
  for (const c of SEED_CLUBS) {
    if (have.has(c.name.toLowerCase())) continue
    const { error } = await supabase.from('clubs').insert({
      name: c.name,
      category: c.category,
      description: c.description,
      created_by: creatorId,
    })
    if (!error) {
      created++
      have.add(c.name.toLowerCase())
    }
  }
  return { ok: true as const, error: null, created }
}

export async function createOneClub(
  email: string | null | undefined,
  creatorId: string,
  fields: { name: string; category: string; description?: string }
) {
  if (!isSuperAdmin(email)) return { ok: false as const, error: 'Super-admin only' }
  const name = fields.name.trim()
  if (name.length < 2) return { ok: false as const, error: 'Name required' }
  const { data, error } = await supabase
    .from('clubs')
    .insert({
      name,
      category: fields.category || 'Other',
      description: fields.description || null,
      created_by: creatorId,
    })
    .select('*')
    .single()
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null, club: data }
}

export async function countClubs() {
  const { count } = await supabase.from('clubs').select('id', { count: 'exact', head: true })
  return count || 0
}
