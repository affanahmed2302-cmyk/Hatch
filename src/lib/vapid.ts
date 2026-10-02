/** Web Push VAPID — override with env on Vercel for production rotation */
export const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BPahq_WXaIRf5wdOsZfn68MPoHLz8Ps7VQGce1biyXzq9qL3BYYfknBlkaNE0MptXc886ZEh_7o3y7fjm5ikEJg'

export const VAPID_PRIVATE =
  process.env.VAPID_PRIVATE_KEY ||
  'uyV2sfNbkMp6ieXTqdOh-Ch8y4lhDwYHMrWI-JdhE_g'

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:affanahmed2302@gmail.com'
