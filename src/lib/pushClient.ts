import { supabase } from './supabase'
import { VAPID_PUBLIC } from './vapid'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function registerPushSubscription(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (!('Notification' in window)) return false

  try {
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    if (Notification.permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })
    }

    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

    const { error } = await supabase.from('push_subs').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: 'user_id,endpoint' }
    )
    if (error) {
      // unique constraint name may differ — try insert ignore duplicate
      await supabase.from('push_subs').insert({
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      })
    }
    return true
  } catch {
    return false
  }
}

/** Fire-and-forget: notify callee even if app closed */
export async function notifyCallPush(calleeId: string, callerName: string, callType: string) {
  try {
    await fetch('/api/push/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callee_id: calleeId, caller_name: callerName, call_type: callType }),
    })
  } catch { /* ignore */ }
}

export async function notifyMessagePush(receiverId: string, senderName: string, preview: string) {
  try {
    await fetch('/api/push/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: receiverId, sender_name: senderName, preview }),
    })
  } catch { /* ignore */ }
}
