/** Preview-only themes. Stored in localStorage — does NOT change production CSS until you confirm. */

export type ThemeId = 'current' | 'midnight' | 'bmsce' | 'emerald' | 'warm' | 'paper'

export type ThemeVars = Record<string, string>

export interface ThemeDef {
  id: ThemeId
  name: string
  blurb: string
  bestFor: string
  vars: ThemeVars
}

/** Current production look */
const CURRENT: ThemeVars = {
  '--bg': '#07070c',
  '--card': 'rgba(22, 22, 32, 0.72)',
  '--border': 'rgba(255, 255, 255, 0.08)',
  '--border-hot': 'rgba(139, 92, 246, 0.35)',
  '--text': '#f4f4f8',
  '--muted': '#9494a8',
  '--violet': '#8b5cf6',
  '--violet-glow': 'rgba(139, 92, 246, 0.45)',
  '--magenta': '#ec4899',
  '--cyan': '#22d3ee',
  '--amber': '#fbbf24',
  '--emerald': '#34d399',
  '--danger': '#f43f5e',
  '--accent': '#8b5cf6',
  '--grad-primary': 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #fbbf24 100%)',
  '--grad-cool': 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)',
  '--grad-mesh': 'linear-gradient(135deg, #8b5cf6, #ec4899, #22d3ee, #fbbf24)',
  '--grad-card': 'linear-gradient(160deg, rgba(139,92,246,0.12), rgba(236,72,153,0.06), transparent 60%)',
}

export const THEMES: ThemeDef[] = [
  {
    id: 'current',
    name: 'Current (Neon Mesh)',
    blurb: 'Production look — violet / magenta / cyan',
    bestFor: 'Baseline',
    vars: CURRENT,
  },
  {
    id: 'midnight',
    name: 'Midnight Campus',
    blurb: 'Softer dark, less neon clash — same Hatch DNA',
    bestFor: 'Pitch polish',
    vars: {
      '--bg': '#0c0c12',
      '--card': 'rgba(22, 22, 31, 0.78)',
      '--border': 'rgba(255, 255, 255, 0.07)',
      '--border-hot': 'rgba(167, 139, 250, 0.4)',
      '--text': '#f0eef8',
      '--muted': '#9a96b0',
      '--violet': '#a78bfa',
      '--violet-glow': 'rgba(167, 139, 250, 0.4)',
      '--magenta': '#f472b6',
      '--cyan': '#67e8f9',
      '--amber': '#fcd34d',
      '--emerald': '#6ee7b7',
      '--danger': '#fb7185',
      '--accent': '#a78bfa',
      '--grad-primary': 'linear-gradient(135deg, #a78bfa 0%, #f472b6 55%, #fcd34d 100%)',
      '--grad-cool': 'linear-gradient(135deg, #67e8f9 0%, #a78bfa 100%)',
      '--grad-mesh': 'linear-gradient(135deg, #a78bfa, #f472b6, #67e8f9, #fcd34d)',
      '--grad-card': 'linear-gradient(160deg, rgba(167,139,250,0.14), rgba(244,114,182,0.06), transparent 60%)',
    },
  },
  {
    id: 'bmsce',
    name: 'BMSCE Blue',
    blurb: 'Institutional trust — blue + gold',
    bestFor: 'Faculty / placement demos',
    vars: {
      '--bg': '#0a0f1a',
      '--card': 'rgba(18, 26, 40, 0.82)',
      '--border': 'rgba(148, 163, 184, 0.12)',
      '--border-hot': 'rgba(59, 130, 246, 0.45)',
      '--text': '#e8eef8',
      '--muted': '#94a3b8',
      '--violet': '#3b82f6',
      '--violet-glow': 'rgba(59, 130, 246, 0.4)',
      '--magenta': '#60a5fa',
      '--cyan': '#38bdf8',
      '--amber': '#fbbf24',
      '--emerald': '#34d399',
      '--danger': '#f87171',
      '--accent': '#3b82f6',
      '--grad-primary': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #fbbf24 100%)',
      '--grad-cool': 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)',
      '--grad-mesh': 'linear-gradient(135deg, #3b82f6, #60a5fa, #38bdf8, #fbbf24)',
      '--grad-card': 'linear-gradient(160deg, rgba(59,130,246,0.16), rgba(251,191,36,0.06), transparent 60%)',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Pulse',
    blurb: 'Focus + energy — green live states',
    bestFor: 'Study / clubs / I\'m Free',
    vars: {
      '--bg': '#070b09',
      '--card': 'rgba(15, 26, 20, 0.82)',
      '--border': 'rgba(52, 211, 153, 0.12)',
      '--border-hot': 'rgba(52, 211, 153, 0.4)',
      '--text': '#e8f5ef',
      '--muted': '#86a89a',
      '--violet': '#34d399',
      '--violet-glow': 'rgba(52, 211, 153, 0.4)',
      '--magenta': '#2dd4bf',
      '--cyan': '#5eead4',
      '--amber': '#fbbf24',
      '--emerald': '#34d399',
      '--danger': '#f87171',
      '--accent': '#34d399',
      '--grad-primary': 'linear-gradient(135deg, #34d399 0%, #2dd4bf 50%, #fbbf24 100%)',
      '--grad-cool': 'linear-gradient(135deg, #5eead4 0%, #34d399 100%)',
      '--grad-mesh': 'linear-gradient(135deg, #34d399, #2dd4bf, #5eead4, #fbbf24)',
      '--grad-card': 'linear-gradient(160deg, rgba(52,211,153,0.16), rgba(45,212,191,0.06), transparent 60%)',
    },
  },
  {
    id: 'warm',
    name: 'Warm Night',
    blurb: 'Cozy social — coral + amber',
    bestFor: 'Lounge / hostel hangouts',
    vars: {
      '--bg': '#0f0b08',
      '--card': 'rgba(26, 20, 16, 0.82)',
      '--border': 'rgba(251, 113, 133, 0.12)',
      '--border-hot': 'rgba(251, 113, 133, 0.4)',
      '--text': '#f5f0e8',
      '--muted': '#a89a8c',
      '--violet': '#fb7185',
      '--violet-glow': 'rgba(251, 113, 133, 0.4)',
      '--magenta': '#f43f5e',
      '--cyan': '#fdba74',
      '--amber': '#fbbf24',
      '--emerald': '#86efac',
      '--danger': '#f43f5e',
      '--accent': '#fb7185',
      '--grad-primary': 'linear-gradient(135deg, #fb7185 0%, #f43f5e 45%, #fbbf24 100%)',
      '--grad-cool': 'linear-gradient(135deg, #fdba74 0%, #fb7185 100%)',
      '--grad-mesh': 'linear-gradient(135deg, #fb7185, #f43f5e, #fdba74, #fbbf24)',
      '--grad-card': 'linear-gradient(160deg, rgba(251,113,133,0.16), rgba(251,191,36,0.08), transparent 60%)',
    },
  },
  {
    id: 'paper',
    name: 'Paper Light',
    blurb: 'Day mode — readable in bright rooms',
    bestFor: 'Classroom demos',
    vars: {
      '--bg': '#f4f2ef',
      '--card': 'rgba(255, 255, 255, 0.92)',
      '--border': 'rgba(28, 25, 23, 0.1)',
      '--border-hot': 'rgba(109, 40, 217, 0.35)',
      '--text': '#1c1917',
      '--muted': '#78716c',
      '--violet': '#6d28d9',
      '--violet-glow': 'rgba(109, 40, 217, 0.25)',
      '--magenta': '#db2777',
      '--cyan': '#0891b2',
      '--amber': '#d97706',
      '--emerald': '#059669',
      '--danger': '#e11d48',
      '--accent': '#6d28d9',
      '--grad-primary': 'linear-gradient(135deg, #6d28d9 0%, #db2777 50%, #d97706 100%)',
      '--grad-cool': 'linear-gradient(135deg, #0891b2 0%, #6d28d9 100%)',
      '--grad-mesh': 'linear-gradient(135deg, #6d28d9, #db2777, #0891b2, #d97706)',
      '--grad-card': 'linear-gradient(160deg, rgba(109,40,217,0.08), rgba(219,39,119,0.04), transparent 60%)',
    },
  },
]

const STORAGE_KEY = 'hatch_theme_preview'

export function getPreviewThemeId(): ThemeId {
  if (typeof window === 'undefined') return 'current'
  try {
    const v = localStorage.getItem(STORAGE_KEY) as ThemeId | null
    if (v && THEMES.some((t) => t.id === v)) return v
  } catch { /* */ }
  return 'current'
}

export function setPreviewThemeId(id: ThemeId) {
  if (typeof window === 'undefined') return
  try {
    if (id === 'current') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, id)
  } catch { /* */ }
  applyThemeVars(id)
  window.dispatchEvent(new CustomEvent('hatch-theme-preview', { detail: id }))
}

export function applyThemeVars(id: ThemeId) {
  if (typeof document === 'undefined') return
  const theme = THEMES.find((t) => t.id === id) || THEMES[0]
  const root = document.documentElement
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v)
  }
  if (id === 'paper') {
    document.body.style.background = theme.vars['--bg']
  } else {
    document.body.style.background = ''
  }
}

export function clearPreviewTheme() {
  setPreviewThemeId('current')
}
