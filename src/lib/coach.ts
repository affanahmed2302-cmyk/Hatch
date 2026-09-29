/** Goal-oriented personal development coach */

export type GoalPlan = {
  title: string
  summary: string
  timelineWeeks: number
  dailyMinutes: number
  phases: { name: string; weeks: string; focus: string; tasks: string[] }[]
  dailyChecklist: string[]
  weeklyMilestones: string[]
  resources: { label: string; tip: string }[]
  calendarBlocks: { title: string; hour: number; durationMin: number; days: string }[]
}

function lower(s: string) {
  return (s || '').toLowerCase()
}

export function generateGoalPlan(goalText: string): GoalPlan {
  const g = lower(goalText)

  if (/jp\s*morgan|jpmorgan|goldman|morgan stanley|investment bank|ib analyst|finance intern|quant intern/.test(g)) {
    return {
      title: 'Crack a top finance / IB internship',
      summary: 'Focus on quant + finance fundamentals, case interviews, and a proof portfolio. For 2nd year: start 9-12 months out.',
      timelineWeeks: 16,
      dailyMinutes: 90,
      phases: [
        { name: 'Foundation', weeks: '1-4', focus: 'Markets + accounting literacy', tasks: ['Read financial statements 30 min/day', 'Finish one intro corporate finance playlist', 'Track one stock weekly and write 5-line notes'] },
        { name: 'Skills stack', weeks: '5-10', focus: 'Excel, modeling, aptitude', tasks: ['Excel: VLOOKUP, pivots, scenarios daily', 'Solve 10 quant aptitude Qs/day', 'Build a simple 3-statement model'] },
        { name: 'Interview mode', weeks: '11-14', focus: 'Behavioral + case', tasks: ['Write STAR stories for 8 campus experiences', 'Practice 3 case interviews with a peer', 'Mock HR + technical once a week'] },
        { name: 'Applications', weeks: '15-16', focus: 'Apply + network', tasks: ['Polish 1-page resume with metrics', 'Apply to 8-12 roles', 'Message 5 alumni with a specific ask'] },
      ],
      dailyChecklist: ['30 min markets/news notes', '40 min skills (Excel or quant)', '20 min resume/LinkedIn or mock Q'],
      weeklyMilestones: ['Week 4: explain a balance sheet to a friend', 'Week 8: finished mini model', 'Week 12: 3 mock interviews done', 'Week 16: applications out'],
      resources: [
        { label: 'Accounting', tip: 'Wall Street Prep free intros + Investopedia 10-K walkthroughs' },
        { label: 'Aptitude', tip: 'Campus placement quant + numerical practice' },
        { label: 'Network', tip: 'BMS alumni in finance — short specific messages only' },
      ],
      calendarBlocks: [
        { title: 'Coach: Markets notes', hour: 7, durationMin: 30, days: 'Mon-Fri' },
        { title: 'Coach: Excel / quant', hour: 20, durationMin: 45, days: 'Mon-Fri' },
        { title: 'Coach: Mock / resume', hour: 11, durationMin: 60, days: 'Sat' },
      ],
    }
  }

  if (/sde|software|faang|google|microsoft|amazon|coder|dsa|leetcode|internship.*tech|tech intern/.test(g)) {
    return {
      title: 'SDE internship path',
      summary: 'Daily DSA + 1 solid project + application cadence. Consistency beats random grinding.',
      timelineWeeks: 12,
      dailyMinutes: 120,
      phases: [
        { name: 'DSA core', weeks: '1-6', focus: 'Arrays to graphs', tasks: ['2-3 LeetCode mediums/day timed', 'Topic notes in one repo', 'Weekly contest'] },
        { name: 'System + project', weeks: '7-9', focus: 'Build proof', tasks: ['Ship one full-stack project with auth + DB', 'README + deploy link', '2 LinkedIn writeups'] },
        { name: 'Interview + apply', weeks: '10-12', focus: 'Mocks + outreach', tasks: ['5 STAR stories', '3 peer mock interviews', 'Apply 5 companies/week'] },
      ],
      dailyChecklist: ['90 min DSA with timer', '20 min project or system design notes', '10 min apply / network'],
      weeklyMilestones: ['Week 3: 50 problems logged', 'Week 6: trees/graphs solid', 'Week 9: project live', 'Week 12: 15+ applications'],
      resources: [
        { label: 'DSA', tip: 'NeetCode roadmap + weekly peer mocks' },
        { label: 'Project', tip: 'Use a real campus problem as your project idea' },
      ],
      calendarBlocks: [
        { title: 'Coach: DSA block', hour: 6, durationMin: 90, days: 'Mon-Fri' },
        { title: 'Coach: Project', hour: 19, durationMin: 45, days: 'Mon-Thu' },
        { title: 'Coach: Contest', hour: 10, durationMin: 120, days: 'Sun' },
      ],
    }
  }

  if (/cat\b|gate\b|gre\b|gmat|upsc|exam/.test(g)) {
    return {
      title: 'Exam-focused sprint',
      summary: 'Syllabus map, daily quota, weekly full mocks. Protect sleep.',
      timelineWeeks: 20,
      dailyMinutes: 180,
      phases: [
        { name: 'Syllabus map', weeks: '1-2', focus: 'Coverage plan', tasks: ['List topics with weightage', 'Set weekly quotas', 'One standard resource per subject'] },
        { name: 'Build phase', weeks: '3-14', focus: 'Learn + revise', tasks: ['Daily topic blocks', 'Error log notebook', 'Weekend sectional tests'] },
        { name: 'Mock phase', weeks: '15-20', focus: 'Full tests', tasks: ['2 full mocks/week', 'Analyze weak areas same day', 'Light revision last 3 days'] },
      ],
      dailyChecklist: ['Main subject 90 min', 'Second subject 60 min', 'Error-log review 20 min'],
      weeklyMilestones: ['Week 2: plan locked', 'Week 8: 50% syllabus', 'Week 14: 100% first pass', 'Week 20: mock average stable'],
      resources: [{ label: 'Mocks', tip: 'Stick to one series — do not hop platforms' }],
      calendarBlocks: [
        { title: 'Coach: Core study', hour: 6, durationMin: 90, days: 'Mon-Sat' },
        { title: 'Coach: Second subject', hour: 18, durationMin: 60, days: 'Mon-Fri' },
        { title: 'Coach: Full mock', hour: 9, durationMin: 180, days: 'Sun' },
      ],
    }
  }

  return {
    title: goalText.trim().slice(0, 80) || 'Your goal',
    summary: 'Clarify the outcome, break into weekly milestones, practice daily, measure weekly.',
    timelineWeeks: 12,
    dailyMinutes: 60,
    phases: [
      { name: 'Clarify', weeks: '1-2', focus: 'Define success metrics', tasks: ['Write the goal in one sentence with a deadline', 'List 5 skills you need', 'Find 2 people who already did it'] },
      { name: 'Build', weeks: '3-8', focus: 'Daily practice', tasks: ['One skill block every day', 'Ship a small artifact each week', 'Ask for feedback every Friday'] },
      { name: 'Prove', weeks: '9-12', focus: 'Portfolio + applications', tasks: ['Package proof', 'Apply or pitch weekly', 'Mock the real evaluation'] },
    ],
    dailyChecklist: ['25-40 min deep work on the main skill', '10 min review notes', '5 min plan tomorrow'],
    weeklyMilestones: ['Week 2: metrics clear', 'Week 6: half the skill stack', 'Week 12: proof ready'],
    resources: [{ label: 'Peers', tip: 'Use Hatch Match/Teams for accountability partners' }],
    calendarBlocks: [
      { title: 'Coach: Goal deep work', hour: 7, durationMin: 45, days: 'Mon-Fri' },
      { title: 'Coach: Weekly review', hour: 10, durationMin: 30, days: 'Sun' },
    ],
  }
}

export function buildIcs(plan: GoalPlan, startDate = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z'
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hatch Coach//EN', 'CALSCALE:GREGORIAN']
  for (let w = 0; w < Math.min(plan.timelineWeeks, 8); w++) {
    for (const block of plan.calendarBlocks) {
      const day = new Date(startDate)
      day.setDate(day.getDate() + w * 7 + (block.days.includes('Sun') ? 6 : 1))
      day.setHours(block.hour, 0, 0, 0)
      const end = new Date(day.getTime() + block.durationMin * 60000)
      const uid = 'hatch-coach-' + w + '-' + block.hour + '-' + block.title.replace(/\W/g, '') + '@hatch'
      lines.push('BEGIN:VEVENT')
      lines.push('UID:' + uid)
      lines.push('DTSTAMP:' + fmt(new Date()))
      lines.push('DTSTART:' + fmt(day))
      lines.push('DTEND:' + fmt(end))
      lines.push('SUMMARY:' + block.title.replace(/,/g, ' '))
      lines.push('DESCRIPTION:Hatch Coach - ' + plan.title.replace(/,/g, ' '))
      lines.push('END:VEVENT')
    }
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(plan: GoalPlan) {
  const ics = buildIcs(plan)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hatch-coach-plan.ics'
  a.click()
  URL.revokeObjectURL(url)
}

export type SavedGoal = {
  goal: string
  plan: GoalPlan
  createdAt: string
  checklistDone: Record<string, boolean>
}

const KEY = 'hatch_coach_goal'

export function loadSavedGoal(): SavedGoal | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveGoal(goal: string, plan: GoalPlan) {
  const payload: SavedGoal = { goal, plan, createdAt: new Date().toISOString(), checklistDone: {} }
  localStorage.setItem(KEY, JSON.stringify(payload))
  return payload
}

export function updateChecklist(done: Record<string, boolean>) {
  const g = loadSavedGoal()
  if (!g) return
  g.checklistDone = done
  localStorage.setItem(KEY, JSON.stringify(g))
}
