/** Pan-India student domain + college pod helpers */

const BLOCKED_PUBLIC = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com',
  'hotmail.com', 'live.com', 'icloud.com', 'proton.me', 'protonmail.com',
  'aol.com', 'mail.com', 'yandex.com', 'zoho.com', 'rediffmail.com',
]

const DOMAIN_POD: Record<string, string> = {
  'bmsce.ac.in': 'bmsce',
  'bmsit.ac.in': 'bmsit',
  'bmssa.ac.in': 'bmssa',
  'rvce.edu.in': 'rvce',
  'pes.edu': 'pesu',
  'pesu.pes.edu': 'pesu',
  'msrit.edu': 'msrit',
  'nitk.edu.in': 'nitk',
  'iisc.ac.in': 'iisc',
  'iitb.ac.in': 'iitb',
  'iitm.ac.in': 'iitm',
  'iitd.ac.in': 'iitd',
  'iitk.ac.in': 'iitk',
  'nitk.ac.in': 'nitk',
  'vit.ac.in': 'vit',
  'srmist.edu.in': 'srm',
  'manipal.edu': 'manipal',
  'christuniversity.in': 'christ',
}

export function extractDomain(email: string): string {
  return (email || '').trim().toLowerCase().split('@')[1] || ''
}

/** Map email domain → college_pod slug */
export function collegePodFromEmail(email: string): string {
  const domain = extractDomain(email)
  if (DOMAIN_POD[domain]) return DOMAIN_POD[domain]
  // e.g. student.bmsce.ac.in → try parent labels
  const parts = domain.split('.')
  for (let i = 0; i < parts.length - 1; i++) {
    const sub = parts.slice(i).join('.')
    if (DOMAIN_POD[sub]) return DOMAIN_POD[sub]
  }
  // generic: first meaningful label before ac/edu
  const label = parts.find((p) => !['ac', 'edu', 'in', 'com', 'org', 'net', 'student', 'mail'].includes(p))
  return (label || 'campus').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'campus'
}

export function collegeLabelFromPod(pod: string): string {
  const map: Record<string, string> = {
    bmsce: 'BMSCE', bmsit: 'BMSIT', bmssa: 'BMSSA', rvce: 'RVCE', pesu: 'PESU',
    msrit: 'MSRIT', nitk: 'NITK', iisc: 'IISc', iitb: 'IITB', iitm: 'IITM',
    iitd: 'IITD', iitk: 'IITK', vit: 'VIT', srm: 'SRM', manipal: 'Manipal', christ: 'Christ',
  }
  return map[pod] || pod.toUpperCase()
}

/** Universal student email gate — any .ac.in / .edu / known college domain */
export function isAllowedStudentEmail(email: string): { ok: boolean; error?: string; pod?: string; domain?: string } {
  const e = (email || '').trim().toLowerCase()
  if (!e || !e.includes('@')) return { ok: false, error: 'Enter a valid email' }
  const domain = extractDomain(e)
  if (BLOCKED_PUBLIC.includes(domain)) {
    return { ok: false, error: 'Public emails blocked — use your college email (.ac.in / .edu)' }
  }
  const okTld =
    domain.endsWith('.ac.in') ||
    domain.endsWith('.edu.in') ||
    domain.endsWith('.edu') ||
    domain.endsWith('.ac.uk') ||
    !!DOMAIN_POD[domain]
  if (!okTld) {
    return { ok: false, error: 'Use an institutional student email (.ac.in, .edu, or verified college domain)' }
  }
  const pod = collegePodFromEmail(e)
  return { ok: true, pod, domain }
}
