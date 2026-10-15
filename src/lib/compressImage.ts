/**
 * Aggressive client-side image compression for Supabase free-tier (1GB files / 500MB DB).
 * Target: ~25–45 KB JPEG avatar (usable face, not 0.2KB — that would be unusable).
 * 10k users × 40KB ≈ 400MB storage — fits free plan with headroom.
 */

export type CompressOpts = {
  maxEdge?: number
  quality?: number
  maxBytes?: number
}

export async function compressImageFile(
  file: File,
  opts: CompressOpts = {}
): Promise<{ blob: Blob; width: number; height: number; bytes: number }> {
  const maxEdge = opts.maxEdge ?? 384
  const maxBytes = opts.maxBytes ?? 45_000
  let quality = opts.quality ?? 0.72

  const bitmap = await createImageBitmap(file)
  let { width, height } = bitmap
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  width = Math.max(1, Math.round(width * scale))
  height = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(bitmap, 0, 0, width, height)
  try {
    bitmap.close()
  } catch {
    /* */
  }

  const toBlob = (q: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Compress failed'))),
        'image/jpeg',
        q
      )
    })

  let blob = await toBlob(quality)
  // Step down quality until under maxBytes or quality floor
  while (blob.size > maxBytes && quality > 0.35) {
    quality -= 0.08
    blob = await toBlob(quality)
  }
  // Still too big? shrink edge further
  if (blob.size > maxBytes) {
    const s2 = 0.7
    canvas.width = Math.max(1, Math.round(width * s2))
    canvas.height = Math.max(1, Math.round(height * s2))
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height) // may need redraw from original — recreate
    // redraw from file
    const bm2 = await createImageBitmap(file)
    ctx.drawImage(bm2, 0, 0, canvas.width, canvas.height)
    try {
      bm2.close()
    } catch {
      /* */
    }
    blob = await toBlob(0.55)
  }

  return { blob, width: canvas.width, height: canvas.height, bytes: blob.size }
}

export async function uploadAvatarCompressed(
  userId: string,
  file: File,
  upload: (path: string, blob: Blob) => Promise<{ publicUrl: string | null; error?: string }>
) {
  const { blob, bytes } = await compressImageFile(file)
  const path = `avatars/${userId}/${Date.now()}.jpg`
  const res = await upload(path, blob)
  return { ...res, bytes }
}
