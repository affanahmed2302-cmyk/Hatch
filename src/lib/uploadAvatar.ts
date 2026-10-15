import { supabase } from '@/lib/supabase'
import { compressImageFile } from '@/lib/compressImage'

/** Compress hard (~25–45KB) then upload — protects free-tier storage for 10k+ users */
export async function uploadUserAvatar(
  userId: string,
  file: File
): Promise<{ ok: true; url: string; bytes?: number } | { ok: false; error: string }> {
  try {
    if (!file.type.startsWith('image/')) {
      return { ok: false, error: 'Choose an image file' }
    }
    const { blob, bytes } = await compressImageFile(file, {
      maxEdge: 384,
      quality: 0.7,
      maxBytes: 42_000,
    })

    const path = `${userId}/avatar.jpg`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })

    if (upErr) {
      const path2 = `avatar_${userId}.jpg`
      const { error: up2 } = await supabase.storage
        .from('avatars')
        .upload(path2, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })
      if (up2) {
        return {
          ok: false,
          error:
            upErr.message ||
            up2.message ||
            'Upload blocked — Supabase Storage: bucket "avatars" public + authenticated upload',
        }
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path2)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      return { ok: true, url, bytes }
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    return { ok: true, url, bytes }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Upload failed' }
  }
}
