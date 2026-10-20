export type GameSlug =
  | 'truth-or-dare'
  | 'never-have-i-ever'
  | 'most-likely-to'
  | 'would-you-rather'
  | 'two-truths'
  | 'charades'
  | 'hot-seat'
  | 'rapid-fire'
  | 'who-am-i'
  | 'story-chain'

export type GameMeta = {
  slug: GameSlug
  name: string
  tagline: string
  players: string
  duration: string
  icon: string
  accent: string
  offline: true
  how: string[]
}

export const GAMES: GameMeta[] = [
  {
    slug: 'truth-or-dare',
    name: 'Truth or Dare',
    tagline: '1000+ prompts · classic group pressure',
    players: '3–12',
    duration: '15–40 min',
    icon: '⚡',
    accent: '#4f46e5',
    offline: true,
    how: [
      'Sit in a circle. One player taps Next.',
      'Choose Truth or Dare.',
      'Complete the prompt. Group decides if it is valid.',
      'Pass to the next person clockwise.',
    ],
  },
  {
    slug: 'never-have-i-ever',
    name: 'Never Have I Ever',
    tagline: 'Fingers down · campus edition',
    players: '4–15',
    duration: '10–25 min',
    icon: '🖐️',
    accent: '#0284c7',
    offline: true,
    how: [
      'Everyone starts with 5 fingers up.',
      'Read: Never have I ever…',
      'If you have done it, put one finger down.',
      'Last with fingers up wins — or first to zero loses.',
    ],
  },
  {
    slug: 'most-likely-to',
    name: 'Most Likely To',
    tagline: 'Point + vote · zero prep',
    players: '4–20',
    duration: '10–20 min',
    icon: '👉',
    accent: '#d97706',
    offline: true,
    how: [
      'Read Who is most likely to…',
      'On three, everyone points at one person.',
      'Most pointed does a mini forfeit or drinks water.',
      'Next prompt.',
    ],
  },
  {
    slug: 'would-you-rather',
    name: 'Would You Rather',
    tagline: 'Two options · debate mode',
    players: '2–12',
    duration: '10–30 min',
    icon: '⚖️',
    accent: '#0d9488',
    offline: true,
    how: [
      'Read both options out loud.',
      'Everyone picks A or B (hands).',
      'Minority explains first.',
      'Optional: minority does a 10-second dare.',
    ],
  },
  {
    slug: 'two-truths',
    name: 'Two Truths & a Lie',
    tagline: 'Bluff · catch the fake',
    players: '3–10',
    duration: '15–30 min',
    icon: '🎭',
    accent: '#7c3aed',
    offline: true,
    how: [
      'One player says three statements about themselves.',
      'Exactly one is a lie.',
      'Group votes which is the lie.',
      'Reveal. Next player.',
    ],
  },
  {
    slug: 'charades',
    name: 'Charades',
    tagline: 'Act it out · no words',
    players: '4–16 (teams)',
    duration: '15–35 min',
    icon: '🎬',
    accent: '#dc2626',
    offline: true,
    how: [
      'Split into two teams.',
      'Actor gets a prompt — no talking.',
      'Team guesses within 60 seconds.',
      'Point per correct guess. Rotate actors.',
    ],
  },
  {
    slug: 'hot-seat',
    name: 'Hot Seat',
    tagline: 'One person · rapid questions',
    players: '3–10',
    duration: '10–20 min',
    icon: '🔥',
    accent: '#ea580c',
    offline: true,
    how: [
      'One player in the hot seat for 60–90 seconds.',
      'Others fire questions from the deck.',
      'Answer quickly — no speeches.',
      'Rotate until everyone has been in the seat.',
    ],
  },
  {
    slug: 'rapid-fire',
    name: 'Rapid Fire',
    tagline: 'Answer in 3 seconds or pass',
    players: '3–12',
    duration: '8–15 min',
    icon: '💨',
    accent: '#16a34a',
    offline: true,
    how: [
      'Answer in about 3 seconds.',
      'If you hesitate, pass.',
      'Keep energy high — no mid-round debates.',
      'Great warm-up before deeper games.',
    ],
  },
  {
    slug: 'who-am-i',
    name: 'Who Am I?',
    tagline: 'Guess your secret identity',
    players: '4–12',
    duration: '15–30 min',
    icon: '❓',
    accent: '#6d28d9',
    offline: true,
    how: [
      'Each player gets a secret identity from the deck.',
      'Others can see it; you cannot.',
      'Ask yes/no questions only.',
      'First to guess their identity wins the round.',
    ],
  },
  {
    slug: 'story-chain',
    name: 'Story Chain',
    tagline: 'One sentence each · chaos story',
    players: '3–12',
    duration: '10–25 min',
    icon: '📖',
    accent: '#0891b2',
    offline: true,
    how: [
      'Read the opening line from the deck.',
      'Each player adds exactly one sentence.',
      'Build on the previous line — no blocking.',
      'After a full circle, vote funniest ending.',
    ],
  },
]

export function getGame(slug: string): GameMeta | undefined {
  return GAMES.find((g) => g.slug === slug)
}
