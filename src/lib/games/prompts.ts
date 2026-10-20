/** Offline party decks */

const TOD_TRUTHS = [
  "What's the most embarrassing thing you've done on campus?",
  'Who was your first crush in college?',
  "What's a secret you've never told your roommate?",
  'Have you ever skipped class for a silly reason? What was it?',
  "What's the worst grade you've hidden from your parents?",
  'Who in this group would you trust with your phone unlocked?',
  "What's your most unpopular opinion about college life?",
  'Have you ever had a crush on a professor or TA?',
  "What's the pettiest thing you've done this semester?",
  "What's one lie you tell at every family gathering?",
  'Who here is most likely to become famous?',
  "What's your guilty pleasure playlist?",
  'Have you ever ghosted someone from campus?',
  "What's the longest you've gone without proper sleep during exams?",
  'Which event do you pretend to care about?',
  "What's your biggest campus FOMO moment?",
  'Who would you call at 3am if something went wrong?',
  "What's the most expensive mistake you've made this year?",
  "What's a habit you're trying to quit?",
  'If your search history was read aloud, what would hurt most?',
  'Who in this room intimidates you a little?',
  "What's the nicest thing someone here has done for you?",
  'Have you ever cried in a bathroom on campus?',
  "What's your toxic trait in group projects?",
  'Which friendship here started by accident?',
]

const TOD_DARES = [
  'Let the group send one harmless text from your phone to a contact they choose.',
  'Do your best impression of someone in this group for 20 seconds.',
  'Speak only in questions for the next 2 rounds.',
  'Sing the chorus of a song the group picks.',
  'Do 10 push-ups or a 20-second plank.',
  'Talk in a movie villain voice until your next turn.',
  'Write a one-line love poem about canteen food.',
  'Do a runway walk across the room.',
  'Say the alphabet backward as fast as you can.',
  'Compliment every person here in one sentence each.',
  'Dance for 15 seconds with no music.',
  'Balance a book or phone on your head for 30 seconds.',
  'Tell a joke — if no one laughs, take another dare.',
  'Switch seats with the person across from you.',
  'Mime your morning routine for 20 seconds.',
  'Let the group choose a nickname for you for this session.',
  'Hold eye contact with the person on your left for 15 seconds.',
  'Speak in slow motion for one full answer.',
  'Act out your favorite movie scene silently.',
  'Do your best news-anchor voice for the next prompt.',
]

function expand(base: string[], count: number, kind: 't' | 'd'): string[] {
  const tags =
    kind === 't'
      ? ['', ' Be honest.', ' No skipping.', ' Group votes if believable.', ' Add a place or year.']
      : ['', ' Under 30 seconds.', ' Group adds one extra rule.', ' Straight face only.', ' Stand up to do it.']
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    out.push(`${base[i % base.length]}${tags[i % tags.length]} (#${i + 1})`)
  }
  return out
}

export const TRUTHS = expand(TOD_TRUTHS, 500, 't')
export const DARES = expand(TOD_DARES, 500, 'd')

export const NEVER = [
  'Never have I ever bunked a full day of classes.',
  'Never have I ever cried over marks.',
  'Never have I ever had a crush on someone in this room.',
  'Never have I ever lied about finishing an assignment.',
  'Never have I ever eaten mess food and regretted it immediately.',
  'Never have I ever been late to an exam.',
  'Never have I ever stalked someone on social media for over an hour.',
  'Never have I ever fallen asleep in a lecture.',
  'Never have I ever pretended to be sick to skip something.',
  'Never have I ever sent a text to the wrong person.',
  'Never have I ever been locked out of my room / hostel.',
  'Never have I ever argued with a professor.',
  'Never have I ever gone to campus on a holiday by mistake.',
  'Never have I ever shared my notes for free and regretted it.',
  'Never have I ever stayed up all night for a submission.',
  'Never have I ever joined a club just for the certificate.',
]

export const MOST_LIKELY = [
  'Who is most likely to become a CEO?',
  'Who is most likely to miss a flight?',
  'Who is most likely to start a campus trend?',
  'Who is most likely to forget their own birthday plan?',
  'Who is most likely to survive a zombie apocalypse?',
  'Who is most likely to get famous on social media?',
  'Who is most likely to fall asleep in the library?',
  'Who is most likely to order food at 2am?',
  'Who is most likely to win an argument with logic?',
  'Who is most likely to cry in a movie theatre?',
  'Who is most likely to become a professor?',
  'Who is most likely to move abroad first?',
  'Who is most likely to start a company with friends here?',
  'Who is most likely to get lost on their own campus?',
  'Who is most likely to go viral for the wrong reason?',
  'Who is most likely to finish the syllabus first?',
  'Who is most likely to plan the best trip?',
  'Who is most likely to ghost a group project?',
  'Who is most likely to become a stand-up comic?',
  'Who is most likely to still be friends with everyone here in 10 years?',
]

export const RATHER: [string, string][] = [
  ['Never use social media again', 'Never eat junk food again'],
  ['Always be 10 minutes late', 'Always be 1 hour early'],
  ['Only whisper for a week', 'Only shout for a day'],
  ['Lose your phone for a month', 'Lose your laptop for a week'],
  ['Be famous but lonely', 'Be unknown but deeply loved'],
  ['Retake one hard subject', 'Give a speech to 500 people tomorrow'],
  ['No music for a year', 'No movies/series for a year'],
  ['Always say what you think', 'Never speak your true opinion'],
  ['Live without AC in summer', 'Live without hot water in winter'],
  ['Group project with strangers', 'Solo project with impossible deadline'],
]

export const CHARADES = [
  'Waiting in mess line',
  'Last-minute assignment panic',
  'Professor taking attendance',
  'Cricket match on the ground',
  'Library silent zone fails',
  'Auto ride bargaining',
  'First day of college',
  'Result day emotions',
  'Group photo that never ends',
  'Wi-Fi not working',
  'Alarm fails on exam morning',
  'Rain + no umbrella on campus',
]

export const HOT_SEAT = [
  'What do you want in the next 5 years?',
  'Who inspires you most in this room?',
  'What are you avoiding right now?',
  'What is one skill you wish you had?',
  'What is your comfort food?',
  'When did you last feel proud of yourself?',
  'What is a boundary you need to set?',
  'If you could restart one semester, which?',
  'What makes you feel safe with people?',
  'What is your campus power colour?',
]

export const RAPID = [
  'Favourite campus spot — go.',
  'Best subject — go.',
  'Worst subject — go.',
  'Morning person or night owl?',
  'Tea or coffee?',
  'Introvert or extrovert today?',
  'One word for this group.',
  'Dream city.',
  'Last app you opened.',
  'Pet or plant?',
]

export const WHO = [
  'APJ Abdul Kalam',
  'Your class CR',
  'Mess uncle',
  'A Bollywood hero',
  'Your future self at 30',
  'A famous cricketer',
  'Campus Wi-Fi router',
  'Your favourite teacher',
  'A startup founder',
  'The library ghost (friendly)',
]

export const STORY = [
  'It was 11:58pm in the lab when the lights flickered…',
  'Nobody expected the canteen samosa to start a revolution…',
  'On the first day of fest, the mic failed and then…',
  'A lost ID card led three strangers into…',
  'The group project folder was empty, so we…',
]

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function pickIndex(n: number) {
  return Math.floor(Math.random() * n)
}
