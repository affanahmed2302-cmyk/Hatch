import { supabase } from '@/lib/supabase'

/** Compress image client-side then upload to public avatars bucket */
export async function uploadUserAvatar(userId: string, file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const blob = await compressImage(file, 720, 0.82)
    const path = `${userId}/avatar.jpg`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

    if (upErr) {
      // Fallback path without folder (some policies only allow root)
      const path2 = `avatar_${userId}.jpg`
      const { error: up2 } = await supabase.storage
        .from('avatars')
        .upload(path2, blob, { upsert: true, contentType: 'image/jpeg' })
      if (up2) {
        return {
          ok: false,
          error:
            upErr.message ||
            up2.message ||
            'Upload blocked — in Supabase Storage make bucket "avatars" public and allow authenticated upload',
        }
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path2)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      return { ok: true, url }
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    return { ok: true, url }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Upload failed' }
  }
}

function compressImage(file: File, maxSide: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let w = img.width
      let h = img.height
      const scale = Math.min(1, maxSide / Math.max(w, h))
      w = Math.round(w * scale)
      h = Math.round(h * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas unsupported'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Compress failed'))),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Invalid image'))
    }
    img.src = url
  })
}
