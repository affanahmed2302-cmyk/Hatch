export type ChatThemeId =
  | 'midnight'
  | 'violet'
  | 'minimal'
  | 'ocean'
  | 'rose'
  | 'forest'
  | 'mono'

export type ChatTheme = {
  id: ChatThemeId
  name: string
  bg: string
  mine: string
  theirs: string
  mineText: string
  theirsText: string
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'midnight',
    name: 'Hatch Midnight',
    bg: '#10110f',
    mine: '#c7f36b',
    theirs: '#191b18',
    mineText: '#10110f',
    theirsText: '#f5f4ee',
  },
  {
    id: 'violet',
    name: 'Violet Glow',
    bg: '#0c0a12',
    mine: '#8b5cf6',
    theirs: '#1a1625',
    mineText: '#fff',
    theirsText: '#f0eef8',
  },
  {
    id: 'minimal',
    name: 'Minimal Light',
    bg: '#f5f4ee',
    mine: '#5a8f0c',
    theirs: '#ffffff',
    mineText: '#fff',
    theirsText: '#10110f',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    bg: '#0a1218',
    mine: '#22d3ee',
    theirs: '#12202a',
    mineText: '#0a1218',
    theirsText: '#e8f7fc',
  },
  {
    id: 'rose',
    name: 'Rose',
    bg: '#140a10',
    mine: '#f472b6',
    theirs: '#221018',
    mineText: '#1a0a12',
    theirsText: '#fce7f3',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: '#0c120e',
    mine: '#34d399',
    theirs: '#14201a',
    mineText: '#0c120e',
    theirsText: '#ecfdf5',
  },
  {
    id: 'mono',
    name: 'Monochrome',
    bg: '#0a0a0a',
    mine: '#e5e5e5',
    theirs: '#1a1a1a',
    mineText: '#0a0a0a',
    theirsText: '#f5f5f5',
  },
]

const KEY = 'hatch_chat_theme_v1'

export function getChatThemeId(): ChatThemeId {
  try {
    const v = localStorage.getItem(KEY) as ChatThemeId | null
    if (v && CHAT_THEMES.some((t) => t.id === v)) return v
  } catch {
    /* */
  }
  return 'midnight'
}

export function setChatThemeId(id: ChatThemeId) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* */
  }
}

export function getChatTheme(): ChatTheme {
  const id = getChatThemeId()
  return CHAT_THEMES.find((t) => t.id === id) || CHAT_THEMES[0]
}
